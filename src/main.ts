import { serve } from '.';
import { parseArgs } from './cli-args';
import * as Logger from './logger';
import { ServiceConfiguration } from './config';

process.on('uncaughtException', function (err) {
  Logger.log('Uncaught exception on process, shutting down:');
  Logger.error(err.stack);
  process.exit(1);
});

function censorConfig(conf: ServiceConfiguration) {
  const censoredEthEndpointArray = conf.EthereumEndpoint.map((endpoint) => endpoint.slice(0, 30) + "**********");

  const external: {[key: string]: any} = {
    ...conf.ExternalLaunchConfig,
    EthereumEndpoint: censoredEthEndpointArray,
  }
  const censored = {
    ...conf,
    EthereumEndpoint: censoredEthEndpointArray,
    ExternalLaunchConfig: external
  }

  if (censored.MaticEndpoint) censored.MaticEndpoint = censored.MaticEndpoint.slice(0, -10) + "**********";
  if (censored.ExternalLaunchConfig.MaticEndpoint) censored.ExternalLaunchConfig.MaticEndpoint = censored.ExternalLaunchConfig.MaticEndpoint.slice(0, -10) + "**********";
  return censored;
}

function enrichConfig(conf: ServiceConfiguration) : ServiceConfiguration {
  const enriched = {
    ...conf,
  }

  // if the EthereumEndpoint is a pointing to the Matic network, do not do the fallback enrichment.

  if (enriched.EthereumEndpoint[0].includes('matic') || conf.EthereumEndpoint[0].includes('polygon')) {
    console.log ('Matic network detected, not adding a fallback endpoint.');
    return enriched;
  }

  const ethEndPoint = [enriched.EthereumEndpoint[0], 'https://rpcman-fastly.orbs.network/rpc?chain=ethereum&appId=guardian&key=888798GHWJ759843GFDSJK759843'];
  enriched.EthereumEndpoint = ethEndPoint;

  return enriched;
}

try {
  Logger.log('Management service started.');
  const config = enrichConfig (parseArgs(process.argv));
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
