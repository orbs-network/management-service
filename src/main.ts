import { serve } from '.';
import { parseArgs } from './cli-args';
import * as Logger from './logger';
import {ServiceConfiguration} from "./config";

process.on('uncaughtException', function (err) {
  Logger.log('Uncaught exception on process, shutting down:');
  Logger.error(err.stack);
  process.exit(1);
});

function censorConfig(conf: ServiceConfiguration) {
  return {
    ...conf,
    EthereumEndpoint: conf.EthereumEndpoint.slice(0, -10) + "**********",
    ExternalLaunchConfig: {
      ...conf.ExternalLaunchConfig,
      EthereumEndpoint: conf.EthereumEndpoint.slice(0, -10) + "**********",
    }
  }
}

try {
  Logger.log('Management service started.');
  const config = parseArgs(process.argv);
  const censoredConfig = censorConfig(config)

  Logger.log(`Input config: '${JSON.stringify(censoredConfig)}'.`);
  const server = serve(config, censoredConfig);

  process.on('SIGINT', function () {
    Logger.log('Received SIGINT, shutting down.');
    if (server) {
      server.close(function (err) {
        if (err) {
          Logger.error(err.stack || err.toString());
        }
        process.exit();
      });
    }
  });
} catch (err) {
  Logger.log('Exception thrown from main, shutting down:');
  Logger.error(err.stack);
  process.exit(128);
}
