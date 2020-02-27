import { serve, Config } from '.';
import { readFileSync } from 'fs';
import yargs from 'yargs';

const options = yargs.option('config', {
    type: 'array',
    description: 'list of config files'
}).argv;

console.log(options.config)
const config: Config = options.config?.reduce((result: any, configFile: any) => {
    return Object.assign(result, JSON.parse(readFileSync(configFile).toString()));
}, {}) as Config;

console.log(config)

serve(7666, config);
