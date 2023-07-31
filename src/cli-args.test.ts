import test from 'ava';
import { parseArgs } from './cli-args';
import mock from 'mock-fs';
import { ServiceConfiguration, validateServiceConfiguration } from './config';

let env: NodeJS.ProcessEnv;

test.before(() => {
  env = process.env;
});

test.beforeEach(() => {
  process.env = { ...env };
});

test.serial.afterEach.always(() => {
  process.env = env;
  mock.restore();
});

const configPath = 'some/path/config.json';

const minimalConfigValue = {
  EthereumGenesisContract: 'bar',
  EthereumEndpoint: 'http://localhost:7545',
  'node-address': 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
};
const inputConfigValue = {
  ...minimalConfigValue,
  BootstrapMode: false,
  Port: -1,
  EthereumFirstBlock: 0,
  EthereumPollIntervalSeconds: 0.5,
  EthereumRequestsPerSecondLimit: 0,
  DeploymentDescriptorUrl: 'https://buzz.com',
  ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
  RegularRolloutWindowSeconds: 1,
  HotfixRolloutWindowSeconds: 1,
  StatusWriteIntervalSeconds: 1,
  DeploymentDescriptorPollIntervalSeconds: 1,
  FinalityBufferBlocks: 0,
  DockerNamespace: 'foo',
  DockerRegistry: 'bar',
  ElectionsAuditOnly: false,
  StatusJsonPath: 'bla',
  StatusAnalyticsJsonPath: 'bla',
  StatusAnalyticsJsonGzipPath: 'bla',
  Verbose: false,
};

const expectedConfigValue: ServiceConfiguration = {
  ...inputConfigValue,
  ExternalLaunchConfig: inputConfigValue,
};

test('parseOptions with no file', (t) => {
  t.throws(() => parseArgs(['--config', configPath]));
});

test('parseOptions with no config and no environment variables', (t) => {
  t.throws(() => parseArgs([]));
});

test('parseOptions: environment variables and no config', (t) => {
  const mockEthereumEndpoint = 'https://mainnet.infura.io/v3/1234567890';
  const mockNodeAddress = '0x1234567890';
  process.env.ETHEREUM_ENDPOINT = mockEthereumEndpoint;
  process.env.NODE_ADDRESS = mockNodeAddress;

  const output = parseArgs([]);

  t.assert((output.ExternalLaunchConfig = {}));
  t.assert((output.StatusJsonPath = './status/status.json'));
  t.assert((output.EthereumEndpoint = mockEthereumEndpoint));
  t.assert((output['node-address'] = mockNodeAddress));
});

test('parseOptions: env vars take precedence', (t) => {
  const mockEthereumEndpoint = 'https://mainnet.infura.io/v3/1234567890';
  const mockNodeAddress = '0x1234567890';
  process.env.ETHEREUM_ENDPOINT = mockEthereumEndpoint;
  process.env.NODE_ADDRESS = mockNodeAddress;

  mock({
    [configPath]: JSON.stringify(inputConfigValue),
  });

  const output = parseArgs(['--config', configPath]);

  t.assert((output.EthereumEndpoint = mockEthereumEndpoint));
  t.assert((output['node-address'] = mockNodeAddress));
});

test('parseOptions with file', (t) => {
  mock({
    [configPath]: JSON.stringify(inputConfigValue),
  });

  t.deepEqual(parseArgs(['--config', configPath]), expectedConfigValue);
});

test('parseOptions with partial file (complete default values)', (t) => {
  mock({
    [configPath]: JSON.stringify(minimalConfigValue),
  });

  const options = parseArgs(['--config', configPath]);
  t.deepEqual(validateServiceConfiguration(options), undefined);
});
