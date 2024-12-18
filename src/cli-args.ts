import { ServiceConfiguration, defaultServiceConfiguration, validateServiceConfiguration } from './config';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import * as Logger from './logger';

import { setConfigEnvVars } from './env-var-args';

function ensureEthereumEndpointIsArray(obj: ServiceConfiguration): void {
  if (!obj.EthereumEndpoint) {
    obj.EthereumEndpoint = []; // Initialize as an empty array if the field is undefined or null
  } else if (!Array.isArray(obj.EthereumEndpoint)) {
    obj.EthereumEndpoint = [obj.EthereumEndpoint]; // Convert to array if it's not already one
  }
}

export function parseArgs(argv: string[]): ServiceConfiguration {
  const options = yargs(argv)
    .option('config', {
      type: 'array',
      string: true,
      description: 'list of config files',
    })
    .exitProcess(false)
    .parse();

  // If config.json not provided, required config values must be passed via environment variables
  const externalLaunchConfig = Object.assign(
    {},
    ...(options.config ?? []).map((configFile) => JSON.parse(readFileSync(configFile).toString()))
  );

  const config: ServiceConfiguration = Object.assign(defaultServiceConfiguration, externalLaunchConfig);

  config.ExternalLaunchConfig = externalLaunchConfig;

  // Support passing required config values via environment variables
  setConfigEnvVars(config);

  ensureEthereumEndpointIsArray(config);

  const validationErrors = validateServiceConfiguration(config);
  if (validationErrors) {
    Logger.error(`Invalid JSON config: '${JSON.stringify(config)}'.`);
    throw new Error(`illegal configuration value ${JSON.stringify(config)}\n ${validationErrors.join('\n')}`);
  }

  return config;
}
