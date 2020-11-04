import { ServiceConfiguration, validateServiceConfiguration, defaultServiceConfiguration } from './config';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import * as Logger from './logger';

export function parseArgs(argv: string[]): ServiceConfiguration {
  const options = yargs(argv)
    .option('config', {
      type: 'array',
      required: true,
      string: true,
      description: 'list of config files',
    })
    .exitProcess(false)
    .parse();

  const externalLaunchConfig = Object.assign(
    {},
    ...options.config.map((configFile) => JSON.parse(readFileSync(configFile).toString()))
  );

  // HACK: remove existing external registry
  if (externalLaunchConfig.EthereumGenesisContract === '0x5454223e3078Db87e55a15bE541cc925f3702eB0') 
    delete externalLaunchConfig.EthereumGenesisContract;
  if (externalLaunchConfig.EthereumFirstBlock === 11050000)
    delete externalLaunchConfig.EthereumFirstBlock;

  const config = Object.assign(defaultServiceConfiguration, externalLaunchConfig);

  config.ExternalLaunchConfig = externalLaunchConfig;

  const validationErrors = validateServiceConfiguration(config);
  if (validationErrors) {
    Logger.error(`Invalid JSON config: '${JSON.stringify(config)}'.`);
    throw new Error(`illegal configuration value ${JSON.stringify(config)}\n ${validationErrors.join('\n')}`);
  }

  return config;
}
