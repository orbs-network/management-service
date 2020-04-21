import { fetchDockerHubToken, DockerHubRepo } from 'docker-hub-utils';
import fetch from 'node-fetch';
import { isValid, compare } from './versioning';
import {
    DockerConfig,
    ServiceConfiguration,
    LegacyBoyarBootstrapInput,
    NodeManagementConfigurationOutput,
    VirtualChainConfigurationOutput,
    TopologyElement,
    CommitteeEvent,
    SubscriptionEvent,
    ProtocolVersionEvent,
} from './data-types';
import { EthereumReader } from './ethereum-reader';
import { merge } from './merge';
import tier1 from './tier-1.json';
import { getVirtualChainPort } from './ports';
import { utcDay } from './utils';
import { EthereumModel } from './eth-model';
import { BlocksTimeModel } from './eth-model/block-time-model';
import { EventTypes } from './eth-model/events-types';
import { Timed } from './eth-model/event-model';

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

    private dockerTagCache = new Map<string, LatestTagResult>();

    constructor(
        private config: ServiceConfiguration,
        private reader: EthereumReader,
        private ethModel: EthereumModel
    ) {}

    private async updateDockerConfig<I extends string>(dc: DockerConfig<I>): Promise<DockerConfig<I>> {
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

    // private translateTopologyChangedEvent(value: Timed & EventTypes['TopologyChanged']): TopologyElement {
    //     console.log('TopologyChanged', value.returnValues);
    //     return {
    //         OrbsAddress: value.returnValues,
    //         Ip: '192.168.199.3',
    //         Port: 4400,
    //     };
    // }
    private translateSubscriptionChangedEvent(value: Timed & EventTypes['SubscriptionChanged']): SubscriptionEvent {
        return {
            RefTime: value.time,
            Data: {
                Status: 'active',
                Tier: value.returnValues.tier,
                RolloutGroup: value.returnValues.deploymentSubset,
                IdentityType: 0,
                Params: {},
            },
        };
    }

    async getVirtualChainConfiguration(vchainId: string) {
        // : Promise<VirtualChainConfigurationOutput> {
        const refTime = Date.now() / 1000; //(await this.reader.getRefTime('latest')) || -1;
        // TODO: test and complete stub
        console.log('SubscriptionChanged', this.ethModel.getLast24HoursEvents('SubscriptionChanged', refTime - utcDay));
        return {
            CurrentRefTime: refTime,
            PageStartRefTime: refTime - utcDay,
            PageEndRefTime: refTime,
            VirtualChains: {
                [vchainId]: {
                    VirtualChainId: vchainId,
                    CurrentTopology: this.ethModel
                        .getLast24HoursEvents('TopologyChanged', refTime - utcDay)
                        .map((d) => d.returnValues as TopologyElement),
                    // CommitteeEvents: this.ethModel
                    //     .getLast24HoursEvents('CommitteeChanged', refTime - utcDay)
                    //     .map((d) => d.returnValues as CommitteeEvent),
                    SubscriptionEvents: this.ethModel
                        .getLast24HoursEvents('SubscriptionChanged', refTime - utcDay)
                        .filter((v) => v.returnValues.vcid === vchainId)
                        .map((d) => this.translateSubscriptionChangedEvent(d)),
                    // ProtocolVersionEvents: this.ethModel
                    //     .getLast24HoursEvents('ProtocolVersionChanged', refTime - utcDay)
                    //     .map((d) => d.returnValues as ProtocolVersionEvent), // TODO this needs more logic for "undo"
                },
            },
        };
    }

    async getNodeManagementConfiguration(): Promise<NodeManagementConfigurationOutput & LegacyBoyarBootstrapInput> {
        const nodeConfiguration = await this.getLegacyBoyarBootstrap();
        const virtualChains = await this.reader.getAllVirtualChains();
        const configResult = {
            orchestrator: this.makeOrchestratorConfig(nodeConfiguration),
            chains: await this.makeChainsConfig(nodeConfiguration, virtualChains),
            services: await this.makeServicesConfig(),
        };
        return merge(nodeConfiguration, configResult); // aggressive passthrough for legacy support as per Tal's decision
    }

    private async makeServicesConfig(): Promise<NodeManagementConfigurationOutput['services']> {
        return {
            'management-service': {
                ExternalPort: 7666,
                InternalPort: 8080,
                DockerConfig: await this.updateDockerConfig({
                    Image: 'orbsnetwork/management-service',
                    Tag: 'G-0-N',
                }),
                Config: this.config,
            },
        };
    }

    private makeChainsConfig(
        _nodeConfiguration: LegacyBoyarBootstrapInput,
        virtualChains: Array<string>
    ): Promise<NodeManagementConfigurationOutput['chains']> {
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
    ): NodeManagementConfigurationOutput['orchestrator'] {
        return Object.assign({}, nodeConfiguration.orchestrator, {
            DynamicManagementConfig: {
                Url: 'http:/localhost:7666/node/management',
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
