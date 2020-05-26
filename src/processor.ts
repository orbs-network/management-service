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
import { utcDay, nowUTC, getIpFromHex } from './utils';
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

    constructor(
        private config: ServiceConfiguration,
        private reader: EthereumReader,
        private ethModel: EthereumModel
    ) {}

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

    private translateCommitteeChangedEvent(value: Timed & EventTypes['CommitteeChanged']): CommitteeEvent {
        return {
            RefTime: value.time,
            Committee: value.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
                OrbsAddress,
                EthAddress: value.returnValues.addrs[idx],
                EffectiveStake: parseInt(value.returnValues.weights[idx]),
                IdentityType: 0,
            })),
        };
    }

    private calcTopology(
        vchainId: string,
        standbysChangedEvent: Timed & EventTypes['StandbysChanged'],
        committeeChangedEvents: Array<Timed & EventTypes['CommitteeChanged']>,
        validatorRegisteredEvents: Iterable<Timed & EventTypes['ValidatorRegistered']>
    ): TopologyElement[] {
        if (!standbysChangedEvent) {
            return []; // not yet polled a single event
        }
        const Port = getVirtualChainPort(vchainId);
        const validatorsLeft = new Set<string>(standbysChangedEvent.returnValues.orbsAddrs);
        for (const committeeChangedEvent of committeeChangedEvents) {
            for (const orbsAddress of committeeChangedEvent.returnValues.orbsAddrs) {
                validatorsLeft.add(orbsAddress);
            }
        }
        const topologyOrbsAddrs = Array.from(validatorsLeft);

        // look for the IP addresses of all validators in topology
        const ips = new Map<string, string>();
        for (const validator of validatorRegisteredEvents) {
            const orbsAddress = validator.returnValues.orbsAddr;
            if (validatorsLeft.delete(orbsAddress)) {
                ips.set(orbsAddress, getIpFromHex(validator.returnValues.ip));
                if (validatorsLeft.size === 0) {
                    break;
                }
            }
        }
        if (this.config.verbose) {
            console.log(
                `calcTopology(${vchainId}) Port = ${Port} topologyOrbsAddrs = ${JSON.stringify(
                    topologyOrbsAddrs
                )} ips = ${JSON.stringify([...ips.entries()].map((e) => e[0] + '->' + e[1]))}`
            );
        }
        return topologyOrbsAddrs.flatMap((OrbsAddress) => {
            const Ip = ips.get(OrbsAddress);
            if (Ip) {
                return [
                    {
                        OrbsAddress,
                        Ip,
                        Port,
                    },
                ];
            } else {
                console.error(`invalid: validator ${OrbsAddress} has no associated ValidatorRegisteredEvent`);
                return [];
            }
        });
    }

    async getVirtualChainConfiguration(vchainId: string) {
        const refTime = await this.ethModel.getUTCRefTime();
        const standbysChangedEvent = this.ethModel.getLastEvent('StandbysChanged', refTime);
        if (!standbysChangedEvent) {
            if (this.config.verbose) {
                console.log(`error in getVirtualChainConfiguration(${vchainId})`);
                console.log(`can't find StandbysChanged event prior to ${refTime}`);
                [...this.ethModel.getEventsFromTime('StandbysChanged', 0, nowUTC() * 2)].forEach((e) =>
                    console.log(`existing event : ${JSON.stringify(e)}`)
                );
            }
            throw new Error(`can't find StandbysChanged event prior to ${refTime}`);
        }
        const committeeChangedEvents = this.ethModel.getEventsFromTime('CommitteeChanged', refTime - utcDay, refTime);
        const subscriptionChangedEvents = this.ethModel.getEventsFromTime(
            'SubscriptionChanged',
            refTime - utcDay,
            refTime
        );
        const validatorRegisteredEvents = this.ethModel.getIteratorFrom('ValidatorRegistered', refTime);
        if (this.config.verbose) {
            console.log(
                `getVirtualChainConfiguration(${vchainId}) refTime = ${refTime} standbysChangedEvent = ${JSON.stringify(
                    standbysChangedEvent.returnValues
                )} `
            );
            committeeChangedEvents.forEach((e) =>
                console.log(`committeeChangedEvent: ${JSON.stringify(e.returnValues)}`)
            );
            subscriptionChangedEvents.forEach((e) =>
                console.log(`subscriptionChangedEvent: ${JSON.stringify(e.returnValues)}`)
            );
        }
        const CurrentTopology = this.calcTopology(
            vchainId,
            standbysChangedEvent,
            committeeChangedEvents,
            validatorRegisteredEvents
        );
        return {
            CurrentRefTime: refTime,
            PageStartRefTime: refTime - utcDay,
            PageEndRefTime: refTime,
            VirtualChains: {
                [vchainId]: {
                    VirtualChainId: vchainId,
                    CurrentTopology,
                    CommitteeEvents: committeeChangedEvents.map((d) => this.translateCommitteeChangedEvent(d)),
                    SubscriptionEvents: subscriptionChangedEvents
                        .filter((v) => v.returnValues.vcid === vchainId)
                        .map((d) => this.translateSubscriptionChangedEvent(d)),
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
