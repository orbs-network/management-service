import { ServiceConfiguration, isLegalServiceConfiguration } from './data-types';
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
        { pollIntervalSeconds: 1, Port: 8080 },
        ...options.config.map((configFile) => JSON.parse(readFileSync(configFile).toString()))
    );

    if (!isLegalServiceConfiguration(config)) {
        throw new Error(`illegal configuration value ${JSON.stringify(config)}`);
    }
    return config;
}
