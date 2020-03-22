/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import test from 'ava';
import { Processor } from './processor';
import nock from 'nock';
import { DockerConfig, ServiceConfiguration } from './data-types';
import { EthereumConfig } from './ethereum-reader';
import { nockDockerHub, nockBoyarConfig } from './test-kit';
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
    const newConfig = await Promise.all(originalConfiguration.map(dc => (processor as any).updateDockerConfig(dc)));

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

test.serial(
    'getBoyarConfiguration returns baseline configurations and propagates legacy config (no chains)',
    async t => {
        const boyarConfigFakeEndpoint = nockBoyarConfig();

        const config: ServiceConfiguration = {
            boyarLegacyBootstrap: boyarConfigFakeEndpoint.congigUri + boyarConfigFakeEndpoint.configPath,
            pollIntervalSeconds: -1,
            EthereumNetwork: 'ganache'
        };

        const processor = new Processor();
        (processor as any).updateDockerConfig = async (dc: any) => ({ Image: dc.Image, Tag: '123' }); // skip docker endpoint
        (processor as any).readEthereumState = async () => ({ virtualChains: [] }); // skip ethereum endpoint

        const result = await processor.getBoyarConfiguration(config, {} as EthereumConfig);

        t.deepEqual(result, {
            extraConfig: boyarConfigFakeEndpoint.extraConfig, // passthrough for legacy support
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
                    DockerConfig: { Image: 'orbsnetwork/management-service', Tag: '123' },
                    Config: Object.assign(config, {
                        extraConfig: boyarConfigFakeEndpoint.extraConfig /* passthrough for legacy support */
                    })
                }
            }
        } as unknown);
        boyarConfigFakeEndpoint.scope.done();
    }
);
