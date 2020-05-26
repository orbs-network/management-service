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
            pollIntervalSeconds: 1,
            Port: 8080,
            FirstBlock: 0,
            finalityBufferTime: 20 * 60,
            finalityBufferBlocks: 80,
            DockerNamespace: 'orbsnetwork',
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
