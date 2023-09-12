import test from 'ava';
import { exampleConfig } from './config.example';
import { setConfigEnvVars } from './env-var-args';
import { ServiceConfiguration } from './config';

test('setConfigEnvVars uses default values when no environment variables', (t) => {
  const input = { ...exampleConfig };
  setConfigEnvVars(input);
  t.deepEqual(input, exampleConfig);
});

/**
 * Converts mockEnv property names to Configuration names
 * Eg. ETHEREUM_ENDPOINT -> EthereumEndpoint
 * */
const camelCaseToSnakeCase = (str: string): string => {
  const result = str.replace(/([a-z])([A-Z])/g, '$1_$2');
  return result.toUpperCase();
};

const mockEnv = {
  BOOTSTRAP_MODE: false,
  PORT: 8080,
  ETHEREUM_GENESIS_CONTRACT: '0x1234567890',
  ETHEREUM_ENDPOINT: 'https://mainnet.infura.io/v3/1234567890',
  MATIC_ENDPOINT: 'https://polygon-rpc.com/',
  DEPLOYMENT_DESCRIPTOR_URL: 'http://localhost/deployment.json',
  ELECTIONS_AUDIT_ONLY: false,
  STATUS_JSON_PATH: '/path/to/status.json',
  STATUS_ANALYTICS_JSON_PATH: '/path/to/analytics.json',
  STATUS_ANALYTICS_JSON_GZIP_PATH: '/path/to/gzip.json',
  STATUS_WRITE_INTERVAL_SECONDS: 60,
  DEPLOYMENT_DESCRIPTOR_POLL_INTERVAL_SECONDS: 120,
  REGULAR_ROLLOUT_WINDOW_SECONDS: 180,
  HOTFIX_ROLLOUT_WINDOW_SECONDS: 240,
  ETHEREUM_POLL_INTERVAL_SECONDS: 300,
  ETHEREUM_REQUESTS_PER_SECOND_LIMIT: 10,
  ELECTIONS_STALE_UPDATE_SECONDS: 360,
  FINALITY_BUFFER_BLOCKS: 12,
  ETHEREUM_FIRST_BLOCK: 123456,
  VERBOSE: false,
  NODE_ADDRESS: '555550a3c12e86b4b5f39b213f7e19d048276dae',
  EXTERNAL_LAUNCH_CONFIG: '{"key": "value"}',
};

test('setConfigEnvVars uses environment variables when set', (t) => {
  const input: ServiceConfiguration = { ...exampleConfig };

  // Need to cast to stop TS complaining about number/string mismatch
  process.env = { ...process.env, ...mockEnv } as unknown as NodeJS.ProcessEnv;

  setConfigEnvVars(input);

  for (const key of Object.keys(exampleConfig)) {
    // Handle `node-address` and `ExternalLaunchConfig` as they are parsed differently
    if (key === 'node-address') {
      t.assert(input[key as keyof ServiceConfiguration] === mockEnv.NODE_ADDRESS);
      continue;
    }

    if (key === 'ExternalLaunchConfig') {
      t.deepEqual(input[key as keyof ServiceConfiguration], JSON.parse(mockEnv.EXTERNAL_LAUNCH_CONFIG));
      continue;
    }

    t.assert(input[key as keyof ServiceConfiguration] === mockEnv[camelCaseToSnakeCase(key) as keyof typeof mockEnv]);
  }
});

test('boolean environment variables are parsed correctly', (t) => {
  const input: ServiceConfiguration = { ...exampleConfig };

  const testCases = [
    { description: 'No env var set, should use default', envVar: undefined, expected: input.BootstrapMode },
    { description: 'Env var set to `true`, should resolve to true', envVar: 'true', expected: true },
    { description: 'Env var set to `false`, should resolve to false', envVar: 'false', expected: false },
  ];

  for (const testCase of testCases) {
    process.env.BOOTSTRAP_MODE = testCase.envVar;
    setConfigEnvVars(input);
    t.assert(input.BootstrapMode === testCase.expected, testCase.description);
  }
});

test('number environment variables are parsed correctly', (t) => {
  const input: ServiceConfiguration = { ...exampleConfig };

  const testCases = [
    { description: 'No env var set, should use default', envVar: undefined, expected: input.Port },
    { description: 'Env var set to `8082`, should resolve to 8082', envVar: '8082', expected: 8082 },
  ];

  for (const testCase of testCases) {
    process.env.PORT = testCase.envVar;
    setConfigEnvVars(input);
    t.assert(input.Port === testCase.expected, testCase.description);
  }
});
