/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import {
    createVC,
    Driver,
    subscriptionChangedEvents,
    topologyChangedEvents,
    committeeChangedEvents,
} from '@orbs-network/orbs-ethereum-contracts-v2';
import test from 'ava';
import nock from 'nock';
import { isNumber } from 'util';
import { DockerConfig, ServiceConfiguration } from './data-types';
import { EthereumModel } from './eth-model';
import { SubscriptionChangedPayload, TopologyChangedPayload, CommitteeChangedPayload } from './eth-model/events-types';
import { EthereumReader, getNewEthereumReader } from './ethereum-reader';
import { getVirtualChainPort } from './ports';
import { addParticipant } from './pos-v2-simulations';
import { Processor, ROLLOUT_GROUP_MAIN } from './processor';
import { deepDataMatcher, nockBoyarConfig, nockDockerHub } from './test-kit';
import tier1 from './tier-1.json';
// import { DEPLOYMENT_SUBSET_MAIN } from '@orbs-network/orbs-ethereum-contracts-v2/release/test/driver';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

test.serial('fetchLatestTagElement gets latest tag from REAL docker hub', async (t) => {
    const repository = { user: 'orbsnetwork', name: 'node' };
    const tag = await Processor.fetchLatestTagElement(repository);
    t.deepEqual(tag, 'v1.3.13');
});

test.serial('fetchLatestTagElement gets latest tag from docker hub', async (t) => {
    const repository = { user: 'orbsnetwork', name: 'node' };
    const tags = ['audit', 'v1.1.1', 'v0.0.0', 'v9.9.9 ', 'foo v4.0.4 bar', 'v1.0.10', '0432a81f', 'G-0-N'];
    const scope = nockDockerHub({ ...repository, tags });
    const tag = await Processor.fetchLatestTagElement(repository);
    t.deepEqual(tag, 'v1.1.1');
    scope.done();
});

test.serial('updateDockerConfig updates tags with minimal requests', async (t) => {
    const originalConfiguration = [
        {
            Image: 'foo/bar',
            Tag: 'foo1',
        },
        {
            Image: 'foo/bar',
            Tag: 'v0.0.1',
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3',
        },
    ] as DockerConfig[];
    const scope = nockDockerHub(
        { user: 'foo', name: 'bar', tags: ['v0.0.3'] },
        { user: 'fizz', name: 'baz', tags: [] }
    );
    const processor = new Processor({} as ServiceConfiguration, null as any, null as any);
    const newConfig = await Promise.all(originalConfiguration.map((dc) => (processor as any).updateDockerConfig(dc)));

    t.deepEqual(newConfig, [
        {
            Image: 'foo/bar',
            Tag: 'v0.0.3',
            Pull: true,
        },
        {
            Image: 'foo/bar',
            Tag: 'v0.0.3',
            Pull: true,
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3',
        },
    ] as DockerConfig[]);

    scope.done();
});

test.serial(
    'getBoyarConfiguration returns boyarLegacyBootstrap and propagates legacy config (no chains)',
    async (t) => {
        const boyarConfigFakeEndpoint = nockBoyarConfig();

        const config: ServiceConfiguration = {
            Port: -1,
            FirstBlock: 0,
            EthereumGenesisContract: 'foo',
            EthereumEndpoint: 'bar',
            boyarLegacyBootstrap: boyarConfigFakeEndpoint.congigUri + boyarConfigFakeEndpoint.configPath,
            pollIntervalSeconds: -1,
            finalityBufferTime: 0,
            finalityBufferBlocks: 0,
            DockerNamespace: 'myDockerNamespace',
        };
        const fakeTag = 'v9.9.9';
        const fakeReader = ({
            // skip ethereum endpoint
            getAllVirtualChains() {
                return [];
            },
        } as unknown) as EthereumReader;

        const scope = nockDockerHub(
            { user: 'myDockerNamespace', name: 'management-service', tags: [fakeTag] },
            { user: 'myDockerNamespace', name: 'signer', tags: [fakeTag] }
        );

        const processor = new Processor(config, fakeReader, null as any);

        const result = await processor.getNodeManagementConfiguration();

        t.deepEqual(result, {
            extraConfig: boyarConfigFakeEndpoint.extraConfig, // passthrough for legacy support
            orchestrator: {
                DynamicManagementConfig: {
                    Url: 'http:/localhost:7666/node/management',
                    ReadInterval: '1m',
                    ResetTimeout: '30m',
                },
            },
            chains: [],
            services: {
                'management-service': {
                    InternalPort: 8080,
                    ExternalPort: 7666,
                    DockerConfig: {
                        Image: 'myDockerNamespace/management-service',
                        Pull: true,
                        Tag: fakeTag,
                    },
                    Config: Object.assign(config, {
                        extraConfig: boyarConfigFakeEndpoint.extraConfig /* passthrough for legacy support */,
                    }),
                },
                signer: {
                    InternalPort: 7777,
                    DockerConfig: {
                        Image: 'myDockerNamespace/signer',
                        Pull: true,
                        Tag: fakeTag,
                    },
                    Config: {
                        api: 'v1',
                    },
                },
            },
        } as unknown);
        boyarConfigFakeEndpoint.scope.done();
        scope.done();
    }
);

test.serial('[integration with reader] getBoyarConfiguration returns chains according to ethereum state', async (t) => {
    t.timeout(60 * 1000);

    const d = await Driver.new();

    const config: ServiceConfiguration = {
        Port: -1,
        FirstBlock: 0,
        EthereumGenesisContract: d.contractRegistry.address,
        EthereumEndpoint: 'http://localhost:7545',
        boyarLegacyBootstrap: 'foo',
        pollIntervalSeconds: -1,
        finalityBufferTime: 0,
        finalityBufferBlocks: 0,
        DockerNamespace: 'myDockerNamespace',
    };
    const fakeTag = 'v9.9.9';
    const processor = new Processor(config, getNewEthereumReader(config), null as any);
    (processor as any).updateDockerConfig = async (dc: any) => ({ ...dc, Tag: fakeTag }); // skip docker endpoint
    (processor as any).getLegacyBoyarBootstrap = async () => ({
        orchestrator: {},
        chains: [],
        services: {},
    }); // skip legacy config

    const result1 = await processor.getNodeManagementConfiguration();
    t.deepEqual(
        result1,
        {
            orchestrator: {
                DynamicManagementConfig: {
                    Url: 'http:/localhost:7666/node/management',
                    ReadInterval: '1m',
                    ResetTimeout: '30m',
                },
            },
            chains: [],
            services: {
                'management-service': {
                    InternalPort: 8080,
                    ExternalPort: 7666,
                    DockerConfig: { Image: 'myDockerNamespace/management-service', Tag: fakeTag },
                    Config: config,
                },
                signer: {
                    InternalPort: 7777,
                    DockerConfig: {
                        Image: 'myDockerNamespace/signer',
                        Tag: fakeTag,
                    },
                    Config: {
                        api: 'v1',
                    },
                },
            },
        } as unknown,
        '0 chains'
    );
    const vc1Id = (subscriptionChangedEvents(await createVC(d)).map((e) => e.vcid)[0] as unknown) as string;
    const vc2Id = (subscriptionChangedEvents(await createVC(d)).map((e) => e.vcid)[0] as unknown) as string;

    const expectedVirtualChainConfig = (vcid: string) => ({
        Id: vcid,
        InternalPort: 4400, // for gossip, identical for all vchains
        ExternalPort: getVirtualChainPort(vcid), // for gossip, different for all vchains
        InternalHttpPort: 8080, // identical for all vchains
        DockerConfig: {
            Image: 'myDockerNamespace/node',
            Tag: fakeTag,
            Resources: tier1,
        },
        Config: {
            ManagementConfigUrl: `http://management-service/vchains/${vcid}/management`,
            SignerUrl: 'http://signer:7777',
            'ethereum-endpoint': 'http://eth.orbs.com', // eventually rename to EthereumEndpoint
        },
    });
    const result2 = await processor.getNodeManagementConfiguration();
    t.deepEqual(result2.chains, [expectedVirtualChainConfig(vc1Id), expectedVirtualChainConfig(vc2Id)], '2 chains');
});

test.serial('[integration with reader] getVirtualChainConfiguration returns according to ethereum state', async (t) => {
    t.timeout(60 * 1000);

    const d = await Driver.new();

    const config: ServiceConfiguration = {
        Port: -1,
        FirstBlock: 0,
        EthereumGenesisContract: d.contractRegistry.address,
        EthereumEndpoint: 'http://localhost:7545',
        boyarLegacyBootstrap: 'foo',
        pollIntervalSeconds: -1,
        finalityBufferTime: 0,
        finalityBufferBlocks: 0,
        DockerNamespace: 'foo',
    };

    const ethReader = getNewEthereumReader(config);
    const ethModel = new EthereumModel(ethReader, config);
    const processor = new Processor(config, ethReader, ethModel);

    const comittyResult = await addParticipant(d, true);
    const participantResult = await addParticipant(d, false);

    // the last event contains data on entire topology
    const topologyEvent = topologyChangedEvents(participantResult.validatorTxResult)[0] as TopologyChangedPayload;
    const comittyEvent = committeeChangedEvents(comittyResult.commiteeTxResult)[0] as CommitteeChangedPayload;
    // const vc1Id = (subscriptionChangedEvents(await createVC(d)).map((e) => e.vcid)[0] as unknown) as string;

    await new Promise((res) => setTimeout(res, 2 * 1000)); // wait 2 seconds to give the last block a distinctive timestamp

    const vc1Subscription = (subscriptionChangedEvents(await createVC(d))[0] as unknown) as SubscriptionChangedPayload;
    const vcid = vc1Subscription.vcid;
    await createVC(d); // add a second vc to demonstrate filtering events per vc

    const lastBlockNumber = await ethReader.getBlockNumber();
    // poll all events
    while ((await ethModel.pollEvents()) < lastBlockNumber) {
        await new Promise((res) => setTimeout(res, 10));
    }

    const refTime = (await ethReader.getRefTime(lastBlockNumber)) || -1;

    const result2 = await processor.getVirtualChainConfiguration(vcid);
    t.deepEqual(
        deepDataMatcher(result2, {
            CurrentRefTime: refTime,
            PageStartRefTime: isNumber,
            PageEndRefTime: isNumber,
            VirtualChains: {
                [vcid]: {
                    VirtualChainId: vcid,
                    CurrentTopology: [
                        {
                            OrbsAddress: topologyEvent.orbsAddrs[0],
                            Ip: topologyEvent.ips[0],
                            Port: getVirtualChainPort(vcid),
                        },
                        {
                            OrbsAddress: topologyEvent.orbsAddrs[1],
                            Ip: topologyEvent.ips[1],
                            Port: getVirtualChainPort(vcid),
                        },
                    ],
                    CommitteeEvents: [
                        {
                            Committee: [
                                {
                                    EthAddress: comittyEvent.addrs[0],
                                    OrbsAddress: comittyEvent.orbsAddrs[0],
                                    EffectiveStake: parseInt(comittyEvent.stakes[0]),
                                    IdentityType: 0,
                                },
                            ],
                        },
                    ],
                    SubscriptionEvents: [
                        {
                            RefTime: isNumber,
                            Data: {
                                Status: 'active',
                                Tier: 'defaultTier',
                                RolloutGroup: ROLLOUT_GROUP_MAIN,
                                IdentityType: 0,
                                Params: {},
                            },
                        },
                    ],
                    // ProtocolVersionEvents: [
                    //     {
                    //         RefTime: isNumber,
                    //         Data: { RolloutGroup: 'ga', Version: 8 },
                    //     },
                    //     {
                    //         RefTime: isNumber,
                    //         Data: { RolloutGroup: 'canary', Version: 9 },
                    //     },
                    // ],
                },
            },
        }),
        []
    );
});
