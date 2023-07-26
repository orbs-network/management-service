import { ServiceConfiguration, defaultServiceConfiguration, validateServiceConfiguration } from './config';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import * as Logger from './logger';

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

  // Support passing required config values via environment variables
  config.EthereumEndpoint = process.env.ETHEREUM_ENDPOINT ?? config.EthereumEndpoint;
  config['node-address'] = process.env.NODE_ADDRESS ?? config['node-address'];

  config.ExternalLaunchConfig = externalLaunchConfig;

  const validationErrors = validateServiceConfiguration(config);
  if (validationErrors) {
    Logger.error(`Invalid JSON config: '${JSON.stringify(config)}'.`);
    throw new Error(`illegal configuration value ${JSON.stringify(config)}\n ${validationErrors.join('\n')}`);
  }

  return config;
}
