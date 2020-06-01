import { ServiceConfiguration, validateServiceConfiguration } from './data-types';
import { readFileSync } from 'fs';
import yargs from 'yargs';
export function parseOptions(argv: string[]): ServiceConfiguration {
    const options = yargs(argv)
        .option('config', {
            type: 'array',
            required: true,
            string: true,
            description: 'list of config files',
        })
        .exitProcess(false)
        .parse();

    const config = Object.assign(
        {
            Port: 8080,
            // TODO: add EthereumGenesisContract with default mainnet address
            DockerNamespace: 'orbsnetwork',
            DockerHubPollIntervalSeconds: 3 * 60,
            EthereumPollIntervalSeconds: 30,
            FirstBlock: 0,
            FinalityBufferBlocks: 100,
            verbose: false,
        },
        ...options.config.map((configFile) => JSON.parse(readFileSync(configFile).toString()))
    );

    const validationErrors = validateServiceConfiguration(config);
    if (validationErrors) {
        throw new Error(`illegal configuration value ${JSON.stringify(config)}\n ${validationErrors.join('\n')}`);
    }
    return config;
}
