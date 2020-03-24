import { fetchDockerHubToken, DockerHubRepo } from 'docker-hub-utils';
import fetch from 'node-fetch';
import { isValid, compare } from './versioning';
import { DockerConfig, ServiceConfiguration, LegacyBoyarBootstrapInput, BoyarConfigurationOutput } from './data-types';
import { EthereumReader, EthereumConfigReader } from './ethereum-reader';
import { merge } from './merge';
import tier1 from './tier-1.json';
import { getVirtualChainPort } from './ports';

export type LatestTagResult = Promise<string | undefined>;
export type EthereumState = {
    virtualChains: Array<string>;
};

export class Processor {
    static getBoyarConfiguration(
        config: ServiceConfiguration
    ): Promise<BoyarConfigurationOutput & LegacyBoyarBootstrapInput> {
        return (
            new Processor()
                .getBoyarConfiguration(config)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .catch((err) => ({ status: 'error', error: '' + err, stack: err?.stack } as any))
        );
    }
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
                return versions[0];
            }
        }
        return; // undefined
    }

    private static async fetchJson(boyarLegacyBootstrap: string) {
        const res = await fetch(boyarLegacyBootstrap);
        const body = await res.text();
        return JSON.parse(body);
    }

    private cache = new Map<string, LatestTagResult>();
    private async updateDockerConfig<I extends string>(dc: DockerConfig<I>): Promise<DockerConfig<I>> {
        if (!this.cache.has(dc.Image)) {
            const [user, name] = dc.Image.split('/');
            this.cache.set(dc.Image, Processor.fetchLatestTagElement({ user, name }));
        }
        const tag = await this.cache.get(dc.Image);
        if (typeof tag === 'string') {
            return { ...dc, Tag: tag, Pull: true };
        }
        return dc;
    }

    private async readEthereumState(config: ServiceConfiguration): Promise<EthereumState> {
        const ethConfig = await new EthereumConfigReader(config).readEthereumConfig();
        const reader = new EthereumReader(ethConfig);
        const virtualChains = await reader.getAllVirtualChains();
        return { virtualChains };
    }

    async getBoyarConfiguration(
        config: ServiceConfiguration
    ): Promise<BoyarConfigurationOutput & LegacyBoyarBootstrapInput> {
        const nodeConfiguration = await this.getLegacyBoyarBootstrap(config);
        const ethState = await this.readEthereumState(config);
        const configResult = {
            orchestrator: this.makeOrchestratorConfig(nodeConfiguration),
            chains: await this.makeChainsConfig(nodeConfiguration, ethState),
            services: await this.makeServicesConfig(config),
        };
        return merge(nodeConfiguration, configResult); // aggressive passthrough for legacy support as per Tal's decision
    }

    private async makeServicesConfig(config: ServiceConfiguration): Promise<BoyarConfigurationOutput['services']> {
        return {
            'management-service': {
                ExternalPort: 7666,
                InternalPort: 8080,
                DockerConfig: await this.updateDockerConfig({
                    Image: 'orbsnetwork/management-service',
                    Tag: 'G-0-N',
                }),
                Config: config,
            },
        };
    }

    private makeChainsConfig(
        _nodeConfiguration: LegacyBoyarBootstrapInput,
        { virtualChains }: EthereumState
    ): Promise<BoyarConfigurationOutput['chains']> {
        return Promise.all(
            virtualChains.map(async (id) => ({
                Id: id,
                InternalPort: 4400, // for gossip, identical for all vchains
                ExternalPort: getVirtualChainPort(id), // for gossip, different for all vchains
                InternalHttpPort: 8080, // identical for all vchains
                DockerConfig: await this.updateDockerConfig({
                    Image: 'orbsnetwork/node',
                    Tag: 'G-0-N',
                    Resources: tier1,
                }),
                Config: {
                    ManagementConfigUrl: 'http://1.1.1.1/vchains/42/management',
                    SignerUrl: 'http://1.1.1.1/signer',
                    'ethereum-endpoint': 'http://localhost:8545', // eventually rename to EthereumEndpoint
                },
            }))
        );
    }

    private makeOrchestratorConfig(
        nodeConfiguration: LegacyBoyarBootstrapInput
    ): BoyarConfigurationOutput['orchestrator'] {
        return Object.assign({}, nodeConfiguration.orchestrator, {
            DynamicManagementConfig: {
                Url: 'http:/localhost:7666/node/management',
                ReadInterval: '1m',
                ResetTimeout: '30m',
            },
        });
    }

    private async getLegacyBoyarBootstrap(config: ServiceConfiguration): Promise<LegacyBoyarBootstrapInput> {
        const legacyBoyarBootstrap: Partial<LegacyBoyarBootstrapInput> = await Processor.fetchJson(
            config.boyarLegacyBootstrap
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
