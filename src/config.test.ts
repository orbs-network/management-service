import test from 'ava';
import { validateServiceConfiguration } from './config';

test('accepts legal config', (t) => {
  t.deepEqual(
    validateServiceConfiguration({
      Port: 2,
      EthereumGenesisContract: 'foo',
      EthereumEndpoint: 'http://localhost:7545',
      EthereumPollIntervalSeconds: 0.1,
      ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
      RegularRolloutWindowSeconds: 1,
      HotfixRolloutWindowSeconds: 1,
      DockerHubPollIntervalSeconds: 0.1,
      FinalityBufferBlocks: 0,
      DockerNamespace: 'foo',
      DockerRegistry: 'bar',
      Verbose: true,
      'node-address': '16fcf728f8dc3f687132f2157d8379c021a08c12',
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
      ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
      RegularRolloutWindowSeconds: 1,
      HotfixRolloutWindowSeconds: 1,
      DockerHubPollIntervalSeconds: 0.1,
      DockerNamespace: 'foo',
      DockerRegistry: 'bar',
      Verbose: true,
      'node-address': '16fcf728f8dc3f687132f2157d8379c021a08c12',
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
      ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
      RegularRolloutWindowSeconds: 1,
      HotfixRolloutWindowSeconds: 1,
      DockerHubPollIntervalSeconds: 0.1,
      FinalityBufferBlocks: 0,
      DockerNamespace: 'foo',
      DockerRegistry: 'bar',
      Verbose: true,
      'node-address': '16fcf728f8dc3f687132f2157d8379c021a08c12',
    }),
    ['Ethereum endpoint is not a valid url']
  );
});
