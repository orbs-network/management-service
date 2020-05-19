import { DockerHubRepo, fetchDockerHubToken } from 'docker-hub-utils';
import fetch from 'node-fetch';
import {
    CommitteeEvent,
    DockerConfig,
    LegacyBoyarBootstrapInput,
    NodeManagementConfigurationOutput,
    ServiceConfiguration,
    SubscriptionEvent,
    TopologyElement,
} from './data-types';
import { EthereumModel } from './eth-model';
import { Timed } from './eth-model/event-model';
import { EventTypes, DEPLOYMENT_SUBSET_MAIN } from './eth-model/events-types';
import { EthereumReader } from './ethereum-reader';
import { merge } from './merge';
import { getVirtualChainPort } from './ports';
import tier1 from './tier-1.json';
import { utcDay } from './utils';
import { compare, isValid } from './versioning';

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

    private translateSubscriptionChangedEvent(value: Timed & EventTypes['SubscriptionChanged']): SubscriptionEvent {
        return {
            RefTime: value.time,
            Data: {
                Status: 'active',
                Tier: value.returnValues.tier,
                RolloutGroup: translateDeploymentSubsetToRouuloutGroup(value.returnValues.deploymentSubset),
                IdentityType: 0,
                Params: {},
            },
        };
    }
    private translateTopologyChangedEvent(
        vchainId: string,
        value: Timed & EventTypes['TopologyChanged']
    ): TopologyElement[] {
        if (!value) {
            return []; // not yet polled a single event
        }
        return value.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
            OrbsAddress,
            Ip: value.returnValues.ips[idx],
            Port: getVirtualChainPort(vchainId),
        }));
    }
    private translateCommitteeChangedEvent(value: Timed & EventTypes['CommitteeChanged']): CommitteeEvent {
        return {
            RefTime: value.time,
            Committee: value.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
                OrbsAddress,
                EthAddress: value.returnValues.addrs[idx],
                EffectiveStake: parseInt(value.returnValues.stakes[idx]),
                IdentityType: 0,
            })),
        };
    }
    // private translateProtocolVersionEvent(value: Timed & EventTypes['ProtocolVersionChanged']): ProtocolVersionEvent {
    //     return {
    //         RefTime: value.time,

    //     };
    // }
    async getVirtualChainConfiguration(vchainId: string) {
        // : Promise<VirtualChainConfigurationOutput> {
        // TODO: cap by last updated block time
        const refTime = await this.ethModel.getUTCRefTime(); // nowUTC(); //(await this.reader.getRefTime('latest')) || -1;
        const topologyChangedEvent = this.ethModel.getLastEvent('TopologyChanged', refTime);
        const committeeChangedEvents = this.ethModel.getEventsFromTime('CommitteeChanged', refTime - utcDay, refTime);
        const subscriptionChangedEvents = this.ethModel.getEventsFromTime(
            'SubscriptionChanged',
            refTime - utcDay,
            refTime
        );
        // TODO: test and complete stub
        return {
            // for now keep it async-ish
            CurrentRefTime: refTime,
            PageStartRefTime: refTime - utcDay,
            PageEndRefTime: refTime,
            VirtualChains: {
                [vchainId]: {
                    VirtualChainId: vchainId,
                    CurrentTopology: this.translateTopologyChangedEvent(vchainId, topologyChangedEvent),
                    CommitteeEvents: committeeChangedEvents.map((d) => this.translateCommitteeChangedEvent(d)),
                    SubscriptionEvents: subscriptionChangedEvents
                        .filter((v) => v.returnValues.vcid === vchainId)
                        .map((d) => this.translateSubscriptionChangedEvent(d)),
                    // ProtocolVersionEvents: this.ethModel
                    //     .getLastEvent('ProtocolVersionChanged', refTime)
                    //     .map((d) => this.translateProtocolVersionEvent(d)), // TODO this needs more logic for "undo"
                    ProtocolVersionEvents: [
                        { RefTime: refTime, Data: { RolloutGroup: ROLLOUT_GROUP_MAIN, Version: 1 } },
                        { RefTime: refTime, Data: { RolloutGroup: ROLLOUT_GROUP_CANARY, Version: 1 } },
                    ],
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
