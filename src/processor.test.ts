/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import { createVC, Driver, subscriptionChangedEvents } from '@orbs-network/orbs-ethereum-contracts-v2';
import test from 'ava';
import nock from 'nock';
import { DockerConfig, ServiceConfiguration } from './data-types';
import { getVirtualChainPort } from './ports';
import { Processor } from './processor';
import { nockBoyarConfig, nockDockerHub } from './test-kit';
import tier1 from './tier-1.json';
import { State } from './model/state';
import { StateManager } from './model/manager';
import { BlockSync } from './ethereum/block-sync';
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
    const processor = new Processor({} as ServiceConfiguration);
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
            finalityBufferBlocks: 0,
            DockerNamespace: 'myDockerNamespace',
            verbose: true,
        };
        const fakeTag = 'v9.9.9';
        const scope = nockDockerHub(
            { user: 'myDockerNamespace', name: 'management-service', tags: [fakeTag] },
            { user: 'myDockerNamespace', name: 'signer', tags: [fakeTag] }
        );

        const processor = new Processor(config);
        const emptyState = new State();
        const result = await processor.getNodeManagementConfiguration(emptyState.getSnapshot());

        t.deepEqual(result, {
            extraConfig: boyarConfigFakeEndpoint.extraConfig, // passthrough for legacy support
            orchestrator: {
                DynamicManagementConfig: {
                    Url: 'http://localhost:7666/node/management',
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
    t.timeout(5 * 60 * 1000);

    const d = await Driver.new();

    const config: ServiceConfiguration = {
        Port: -1,
        FirstBlock: await d.web3.eth.getBlockNumber(),
        EthereumGenesisContract: d.contractRegistry.address,
        EthereumEndpoint: 'http://localhost:7545',
        boyarLegacyBootstrap: 'foo',
        pollIntervalSeconds: -1,
        finalityBufferBlocks: 0,
        DockerNamespace: 'myDockerNamespace',
        verbose: true,
    };
    const fakeTag = 'v9.9.9';
    const state = new StateManager();
    const processor = new Processor(config);
    (processor as any).updateDockerConfig = async (dc: any) => ({ ...dc, Tag: fakeTag }); // skip docker endpoint
    (processor as any).getLegacyBoyarBootstrap = async () => ({
        orchestrator: {},
        chains: [],
        services: {},
    }); // skip legacy config

    const result1 = await processor.getNodeManagementConfiguration(state.getCurrentSnapshot());
    t.deepEqual(
        result1,
        {
            orchestrator: {
                DynamicManagementConfig: {
                    Url: 'http://localhost:7666/node/management',
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
    const vc2Tx = await createVC(d);
    const vc2Id = (subscriptionChangedEvents(vc2Tx).map((e) => e.vcid)[0] as unknown) as string;

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
    await new Promise((res) => setTimeout(res, 5 * 1000));
    await d.newSubscriber('defaultTier', 0); // add a block for finality

    const blockSync = new BlockSync(state, config);
    await blockSync.run();
    const result2 = await processor.getNodeManagementConfiguration(state.getCurrentSnapshot());
    t.deepEqual(result2.chains, [expectedVirtualChainConfig(vc1Id), expectedVirtualChainConfig(vc2Id)], '2 chains');
});
