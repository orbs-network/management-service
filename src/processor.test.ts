/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import test from 'ava';
import { Processor } from './processor';
import nock from 'nock';
import { DockerConfig, ServiceConfiguration } from './data-types';
import { nockDockerHub, nockBoyarConfig, deepDataMatcher } from './test-kit';
import { Driver, createVC, subscriptionChangedEvents, topologyChangedEvents } from '@orbs-network/orbs-ethereum-contracts-v2';
import tier1 from './tier-1.json';
import { getVirtualChainPort } from './ports';
import { EthereumReader, getNewEthereumReader } from './ethereum-reader';
import { EthereumModel } from './eth-model';
import { isNumber } from 'util';
import { EventTypes, SubscriptionChangedPayload, DEPLOYMENT_SUBSET_MAIN, TopologyChangedayload } from './eth-model/events-types';
import { addParticipant } from './pos-v2-simulations';
// import { DEPLOYMENT_SUBSET_MAIN } from '@orbs-network/orbs-ethereum-contracts-v2/release/test/driver';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

test.serial('fetchLatestTagElement gets latest tag from docker hub', async (t) => {
    const repository = { user: 'orbsnetwork', name: 'node' };
    const tags = ['audit', 'G-2-N', 'G-0-N', 'G-1-N', 'foo G-6-N bar', 'v1.0.10', '0432a81f'];
    const scope = nockDockerHub({ ...repository, tags });
    const tag = await Processor.fetchLatestTagElement(repository);
    t.deepEqual(tag, 'foo G-6-N bar');
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
            Tag: 'G-1-N',
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3',
        },
    ] as DockerConfig[];
    const scope = nockDockerHub({ user: 'foo', name: 'bar', tags: ['G-3-N'] }, { user: 'fizz', name: 'baz', tags: [] });
    const processor = new Processor({} as ServiceConfiguration, null as any, null as any);
    const newConfig = await Promise.all(originalConfiguration.map((dc) => (processor as any).updateDockerConfig(dc)));

    t.deepEqual(newConfig, [
        {
            Image: 'foo/bar',
            Tag: 'G-3-N',
            Pull: true,
        },
        {
            Image: 'foo/bar',
            Tag: 'G-3-N',
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
        };

        const fakeReader = ({
            // skip ethereum endpoint
            getAllVirtualChains() {
                return [];
            },
        } as unknown) as EthereumReader;
        const processor = new Processor(config, fakeReader, null as any);
        (processor as any).updateDockerConfig = async (dc: any) => ({ ...dc, Tag: 'fake' }); // skip docker endpoint

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
                    DockerConfig: { Image: 'orbsnetwork/management-service', Tag: 'fake' },
                    Config: Object.assign(config, {
                        extraConfig: boyarConfigFakeEndpoint.extraConfig /* passthrough for legacy support */,
                    }),
                },
            },
        } as unknown);
        boyarConfigFakeEndpoint.scope.done();
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
    };
    const processor = new Processor(config, getNewEthereumReader(config), null as any);
    (processor as any).updateDockerConfig = async (dc: any) => ({ ...dc, Tag: 'fake' }); // skip docker endpoint
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
                    DockerConfig: { Image: 'orbsnetwork/management-service', Tag: 'fake' },
                    Config: config,
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
            Image: 'orbsnetwork/node',
            Tag: 'fake',
            Resources: tier1,
        },
        Config: {
            ManagementConfigUrl: 'http://1.1.1.1/vchains/42/management',
            SignerUrl: 'http://1.1.1.1/signer',
            'ethereum-endpoint': 'http://localhost:8545', // eventually rename to EthereumEndpoint
        },
    });
    const result2 = await processor.getNodeManagementConfiguration();
    t.deepEqual(result2.chains, [expectedVirtualChainConfig(vc1Id), expectedVirtualChainConfig(vc2Id)], '2 chains');
});

test.serial.only(
    '[integration with reader] getVirtualChainConfiguration returns according to ethereum state',
    async (t) => {
        t.timeout(60 * 1000);

        const d = await Driver.new();

        const config: ServiceConfiguration = {
            Port: -1,
            FirstBlock: 0,
            EthereumGenesisContract: d.contractRegistry.address,
            EthereumEndpoint: 'http://localhost:7545',
            boyarLegacyBootstrap: 'foo',
            pollIntervalSeconds: -1,
        };

        const ethReader = getNewEthereumReader(config);
        const ethModel = new EthereumModel(ethReader);
        const processor = new Processor(config, ethReader, ethModel);

        await addParticipant(d, true);
        const participantResult = await addParticipant(d, false);

        const topologyEvent = topologyChangedEvents(participantResult.validatorTxResult)[0] as TopologyChangedayload;
        // const vc1Id = (subscriptionChangedEvents(await createVC(d)).map((e) => e.vcid)[0] as unknown) as string;
        const vc1Subscription = (subscriptionChangedEvents(
            await createVC(d)
        )[0] as unknown) as SubscriptionChangedPayload;
        const vc1Id = vc1Subscription.vcid;
        await createVC(d); // add a second vc to demonstrate filtering events per vc

        // poll all events
        while (await ethModel.pollEvents() < await ethReader.getBlockNumber()) {
            await new Promise((res) => setTimeout(res, 50));
        }

        const result1 = processor.getVirtualChainConfiguration(vc1Id);

        t.deepEqual(
            deepDataMatcher(result1, {
                CurrentRefTime: isNumber,
                PageStartRefTime: isNumber,
                PageEndRefTime: isNumber,
                VirtualChains: {
                    [vc1Id]: {
                        VirtualChainId: vc1Id,
                        CurrentTopology: [
                            { "OrbsAddress": topologyEvent.orbsAddrs[0], "Ip": topologyEvent.ips[0], "Port": 4400 },
                            { "OrbsAddress": "d27e2e7398e2582f63d0800330010b3e58952ff6", "Ip": "192.168.199.3", "Port": 4400 }
                        ],
                        // CommitteeEvents: [],
                        SubscriptionEvents: [
                            {
                                RefTime: isNumber,
                                Data: {
                                    Status: 'active',
                                    Tier: 'defaultTier',
                                    RolloutGroup: DEPLOYMENT_SUBSET_MAIN,
                                    IdentityType: 0,
                                    Params: {},
                                },
                            },
                        ],
                        // ProtocolVersionEvents: [],
                    },
                },
            }),
            []
        );
    }
);
