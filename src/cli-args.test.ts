import test from 'ava';
import { parseArgs } from './cli-args';
import mock from 'mock-fs';
import { ServiceConfiguration, validateServiceConfiguration } from './config';

test.serial.afterEach.always(() => {
  mock.restore();
});

const configPath = 'some/path/config.json';

const minimalConfigValue = {
  EthereumGenesisContract: 'bar',
  EthereumEndpoint: 'http://localhost:7545',
};
const configValue: ServiceConfiguration = {
  ...minimalConfigValue,
  Port: -1,
  FirstBlock: 0,
  EthereumPollIntervalSeconds: 0.5,
  RegularRolloutWindow: 1,
  HotfixRolloutWindow: 1,
  DockerHubPollIntervalSeconds: 1,
  FinalityBufferBlocks: 0,
  DockerNamespace: 'foo',
  DockerRegistry: 'bar',
  Verbose: true,
};

test.serial('parseOptions with file', (t) => {
  mock({
    [configPath]: JSON.stringify(configValue),
  });

  t.deepEqual(parseArgs(['--config', configPath]), configValue);
});

test.serial('parseOptions with partial file (complete default values)', (t) => {
  mock({
    [configPath]: JSON.stringify(minimalConfigValue),
  });

  const options = parseArgs(['--config', configPath]);
  t.deepEqual(validateServiceConfiguration(options), undefined);
});

test.serial('parseOptions with no file', (t) => {
  t.throws(() => parseArgs(['--config', configPath]));
});

test.serial('parseOptions with no config', (t) => {
  t.throws(() => parseArgs([]));
});
