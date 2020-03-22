import test from 'ava';
import { Processor } from './processor';
import nock from 'nock';
import { DockerConfig, ServiceConfiguration } from './data-types';
import { EthereumConfig } from './ethereum-reader';
import { nockDockerHub } from './test-kit';
// import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
// import { getAddresses } from './test-kit';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

test.serial('fetchLatestTagElement gets latest tag from docker hub', async t => {
    const repository = { user: 'orbsnetwork', name: 'node' };
    const tags = ['audit', 'G-2-N', 'G-0-N', 'G-1-N', 'foo G-6-N bar', 'v1.0.10', '0432a81f'];
    const scope = nockDockerHub({ ...repository, tags });
    const tag = await Processor.fetchLatestTagElement(repository);
    t.deepEqual(tag, 'foo G-6-N bar');
    scope.done();
});

test.serial('updateDockerConfig updates tags with minimal requests', async t => {
    const originalConfiguration = [
        {
            Image: 'foo/bar',
            Tag: 'foo1'
        },
        {
            Image: 'foo/bar',
            Tag: 'G-1-N'
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3'
        }
    ] as DockerConfig[];
    const scope = nockDockerHub({ user: 'foo', name: 'bar', tags: ['G-3-N'] }, { user: 'fizz', name: 'baz', tags: [] });
    const processor = new Processor();
    const newConfig = await Promise.all(originalConfiguration.map(dc => processor.updateDockerConfig(dc)));

    t.deepEqual(newConfig, [
        {
            Image: 'foo/bar',
            Tag: 'G-3-N',
            Pull: true
        },
        {
            Image: 'foo/bar',
            Tag: 'G-3-N',
            Pull: true
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3'
        }
    ] as DockerConfig[]);

    scope.done();
});

test.serial('getBoyarConfiguration returns baseline configurations and propagates legacy config', async t => {
    t.timeout(60 * 1000);
    const congigUri = 'https://s3.amazonaws.com';
    const configPath = '/orbs-bootstrap-prod/boyar/config.json';
    const body: object = {
        placeholder: 'hello world',
        services: {
            'management-service': {
                Config: { placeholder: 'hello world' }
            }
        }
    };

    const ethUri = 'http://localhost:7545';
    // const d = await Driver.new();

    const ethConfig: EthereumConfig = {
        contracts: {
            Subscriptions: ''
        },
        firstBlock: 0,
        httpEndpoint: ethUri
    };

    const scope = nock(congigUri)
        .get(configPath)
        .reply(200, body);

    const config: ServiceConfiguration = {
        boyarLegacyBootstrap: congigUri + configPath,
        pollIntervalSeconds: -1,
        EthereumNetwork: 'ganache'
    };

    const processor = new Processor();
    // fake method, to avoid docker hub state entering the result
    function fakeUpdateDockerConfig<I extends string>(dc: DockerConfig<I>): Promise<DockerConfig<I>> {
        return Promise.resolve({ Image: dc.Image, Tag: '123' });
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    processor.updateDockerConfig = fakeUpdateDockerConfig;

    function fakeReadEthereumState(_ethConfig: EthereumConfig): ReturnType<Processor['readEthereumState']> {
        return Promise.resolve({ virtualChains: [] });
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    processor.readEthereumState = fakeReadEthereumState;

    const result = await processor.getBoyarConfiguration(config, ethConfig);

    t.deepEqual(result, {
        placeholder: 'hello world', // passthrough for legacy support
        orchestrator: {
            DynamicManagementConfig: {
                Url: 'http:/localhost:7666/node/management',
                ReadInterval: '1m',
                ResetTimeout: '30m'
            }
        },
        chains: [],
        services: {
            'management-service': {
                InternalPort: 8080,
                ExternalPort: 7666,
                DockerConfig: await fakeUpdateDockerConfig({ Image: 'orbsnetwork/management-service' } as DockerConfig),
                Config: Object.assign(config, { placeholder: 'hello world' /* passthrough for legacy support */ })
            }
        }
    } as unknown);
    scope.done();
});
