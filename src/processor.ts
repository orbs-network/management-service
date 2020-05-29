import { DockerHubRepo, fetchDockerHubToken } from 'docker-hub-utils';
import fetch from 'node-fetch';
import {
    DockerConfig,
    LegacyBoyarBootstrapInput,
    NodeManagementConfigurationOutput,
    ServiceConfiguration,
} from './data-types';
import { merge } from './merge';
import { getVirtualChainPort } from './ports';
import tier1 from './tier-1.json';
import { compare, isValid } from './versioning';
import { StateSnapshot } from './model/state';
import { DEPLOYMENT_SUBSET_MAIN } from './ethereum/events-types';

export const ROLLOUT_GROUP_MAIN = 'ga';
export const ROLLOUT_GROUP_CANARY = 'canary';

export function translateDeploymentSubsetToRouuloutGroup(ds: string): string {
    return ds === DEPLOYMENT_SUBSET_MAIN ? ROLLOUT_GROUP_MAIN : ROLLOUT_GROUP_CANARY;
}
export type LatestTagResult = Promise<string | undefined>;

export class Processor {
    static async fetchLatestTagElement(repository: { name: string; user: string }): LatestTagResult {
        const token = await fetchDockerHubToken(repository as DockerHubRepo);
        const res = await fetch(`https://registry.hub.docker.com/v2/${repository.user}/${repository.name}/tags/list`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        const textRes = await res.text();
        const body = JSON.parse(textRes);
        const tags = body?.tags;
        if (tags && Array.isArray(tags) && tags.every((t) => typeof t === 'string')) {
            const versions = tags.filter(isValid).sort(compare);
            if (versions.length) {
                return versions[versions.length - 1];
            }
        }
        return; // undefined
    }

    private static async fetchJson(boyarLegacyBootstrap: string) {
        const res = await fetch(boyarLegacyBootstrap);
        const body = await res.text();
        return JSON.parse(body);
    }

    private dockerTagCache = new Map<string, LatestTagResult>();

    constructor(private config: ServiceConfiguration) {}

    private async updateDockerConfig(dc: DockerConfig): Promise<DockerConfig> {
        if (!this.dockerTagCache.has(dc.Image)) {
            const [user, name] = dc.Image.split('/');
            this.dockerTagCache.set(dc.Image, Processor.fetchLatestTagElement({ user, name }));
        }
        const tag = await this.dockerTagCache.get(dc.Image);
        if (typeof tag === 'string') {
            return { ...dc, Tag: tag, Pull: true };
        }
        return dc;
    }

    async getNodeManagementConfiguration(
        snapshot: StateSnapshot
    ): Promise<NodeManagementConfigurationOutput & LegacyBoyarBootstrapInput> {
        const nodeConfiguration = await this.getLegacyBoyarBootstrap();
        const virtualChains = Object.keys(snapshot.CurrentVirtualChains).sort();
        const configResult = {
            orchestrator: this.makeOrchestratorConfig(nodeConfiguration),
            chains: await this.makeChainsConfig(nodeConfiguration, virtualChains),
            services: await this.makeServicesConfig(),
        };
        this.dockerTagCache.clear();
        return merge(nodeConfiguration, configResult); // aggressive passthrough for legacy support
    }

    private async makeServicesConfig(): Promise<NodeManagementConfigurationOutput['services']> {
        return {
            'management-service': {
                ExternalPort: 7666,
                InternalPort: 8080,
                DockerConfig: await this.updateDockerConfig({
                    Image: this.config.DockerNamespace + '/management-service',
                    Tag: 'G-0-N',
                }),
                Config: this.config,
            },
            signer: {
                InternalPort: 7777,
                DockerConfig: await this.updateDockerConfig({
                    Image: this.config.DockerNamespace + '/signer',
                    Tag: 'v2.0.3',
                }),
                Config: {
                    api: 'v1',
                },
            },
        };
    }

    private makeChainsConfig(
        _nodeConfiguration: LegacyBoyarBootstrapInput,
        virtualChains: Array<string>
    ): Promise<NodeManagementConfigurationOutput['chains']> {
        return Promise.all(
            virtualChains.map(async (vcid) => ({
                Id: vcid,
                InternalPort: 4400, // for gossip, identical for all vchains
                ExternalPort: getVirtualChainPort(vcid), // for gossip, different for all vchains
                InternalHttpPort: 8080, // identical for all vchains
                DockerConfig: await this.updateDockerConfig({
                    Image: this.config.DockerNamespace + '/node',
                    Tag: 'G-0-N',
                    Resources: tier1,
                }),
                Config: {
                    ManagementConfigUrl: `http://management-service/vchains/${vcid}/management`,
                    SignerUrl: 'http://signer:7777',
                    'ethereum-endpoint': 'http://eth.orbs.com', // eventually rename to EthereumEndpoint
                },
            }))
        );
    }

    private makeOrchestratorConfig(
        nodeConfiguration: LegacyBoyarBootstrapInput
    ): NodeManagementConfigurationOutput['orchestrator'] {
        return Object.assign({}, nodeConfiguration.orchestrator, {
            DynamicManagementConfig: {
                Url: 'http://localhost:7666/node/management',
                ReadInterval: '1m',
                ResetTimeout: '30m',
            },
        });
    }

    private async getLegacyBoyarBootstrap(): Promise<LegacyBoyarBootstrapInput> {
        const legacyBoyarBootstrap: Partial<LegacyBoyarBootstrapInput> = await Processor.fetchJson(
            this.config.boyarLegacyBootstrap
        );
        return Object.assign(
            {
                orchestrator: {},
                chains: [],
                services: {},
            },
            legacyBoyarBootstrap
        );
    }
}
