import test from 'ava';
import { validateServiceConfiguration } from './config';

test('accepts legal config', (t) => {
  t.deepEqual(
    validateServiceConfiguration({
      Port: 2,
      EthereumGenesisContract: 'foo',
      EthereumEndpoint: 'http://localhost:7545',
      EthereumPollIntervalSeconds: 0.1,
      DockerHubPollIntervalSeconds: 0.1,
      FinalityBufferBlocks: 0,
      DockerNamespace: 'foo',
      Verbose: true,
    }),
    undefined
  );
});

test('declines illegal config (1)', (t) => {
  t.deepEqual(
    validateServiceConfiguration({
      Port: 2,
      EthereumGenesisContract: 'foo',
      EthereumEndpoint: 'http://localhost:7545',
      EthereumPollIntervalSeconds: 0.1,
      DockerHubPollIntervalSeconds: 0.1,
      DockerNamespace: 'foo',
      Verbose: true,
    }),
    ["Finality buffer blocks can't be blank"]
  );
});

test('declines illegal config (2)', (t) => {
  t.deepEqual(
    validateServiceConfiguration({
      Port: 2,
      EthereumGenesisContract: 'foo',
      EthereumEndpoint: 'foo-bar:123',
      EthereumPollIntervalSeconds: 0.1,
      DockerHubPollIntervalSeconds: 0.1,
      FinalityBufferBlocks: 0,
      DockerNamespace: 'foo',
      Verbose: true,
    }),
    ['Ethereum endpoint is not a valid url']
  );
});
