import test from 'ava';
import { validateServiceConfiguration } from './data-types';

test('accepts legal config', (t) => {
    t.deepEqual(
        undefined,
        validateServiceConfiguration({
            Port: 2,
            EthereumGenesisContract: 'foo',
            EthereumEndpoint: 'http://localhost:7545',
            boyarLegacyBootstrap: 'https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json',
            pollIntervalSeconds: 0.1,
            finalityBufferBlocks: 0,
            DockerNamespace: 'foo',
            verbose: true,
        })
    );
});

test('declines illegal config (1)', (t) => {
    t.deepEqual(
        ["Finality buffer blocks can't be blank"],
        validateServiceConfiguration({
            Port: 2,
            EthereumGenesisContract: 'foo',
            EthereumEndpoint: 'http://localhost:7545',
            boyarLegacyBootstrap: 'https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json',
            pollIntervalSeconds: 0.1,
            DockerNamespace: 'foo',
            verbose: true,
        })
    );
});
test('declines illegal config (2)', (t) => {
    t.deepEqual(
        ['Ethereum endpoint is not a valid url'],
        validateServiceConfiguration({
            Port: 2,
            EthereumGenesisContract: 'foo',
            EthereumEndpoint: 'foo-bar:123',
            boyarLegacyBootstrap: 'https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json',
            pollIntervalSeconds: 0.1,
            finalityBufferBlocks: 0,
            DockerNamespace: 'foo',
            verbose: true,
        })
    );
});
