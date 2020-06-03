import { ServiceConfiguration } from './config';
import express, { Request, Response, NextFunction } from 'express';
import { errorString } from './helpers';
import { TaskLoop } from './task-loop';
import { StateManager } from './model/manager';
import { BlockSync } from './ethereum/block-sync';
import { ImagePoll } from './dockerhub/image-poll';
import { getNodeManagement } from './api/processor-node';
import { getVirtualChainManagement } from './api/processor-vc';
import * as Logger from './logger';

// function wrapAsync(fn: RequestHandler): RequestHandler {
//    return (req, res, next) => fn(req, res, next).catch(next);
// }

export function serve(serviceConfig: ServiceConfiguration) {
  const state = new StateManager();
  const blockSync = new BlockSync(state, serviceConfig);
  const imagePoll = new ImagePoll(state, serviceConfig);

  const app = express();
  app.set('json spaces', 2);

  app.get('/node/management', (_request, response) => {
    const snapshot = state.getCurrentSnapshot();
    const body = getNodeManagement(snapshot, serviceConfig);
    response.status(200).json(body);
  });

  // TODO: remove async after temp genesis block hack (!)
  app.get('/vchains/:vchainId/management', async (request, response) => {
    const { vchainId } = request.params;
    const snapshot = state.getCurrentSnapshot();
    const body = await getVirtualChainManagement(parseInt(vchainId), snapshot, serviceConfig);
    response.status(200).json(body);
  });

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error) {
      if (serviceConfig.verbose) {
        Logger.error(`Error response to ${req.url} : ${errorString(error)}`);
      }
      return res.status(500).json({
        status: 'error',
        error: errorString(error),
      });
    }
    return next(error);
  });

  const blockSyncTask = new TaskLoop(() => blockSync.run(), serviceConfig.EthereumPollIntervalSeconds * 1000);
  const imagePollTask = new TaskLoop(() => imagePoll.run(), serviceConfig.EthereumPollIntervalSeconds * 1000);
  blockSyncTask.start();
  imagePollTask.start();

  const server = app.listen(serviceConfig.Port, '0.0.0.0', () =>
    Logger.log(`Management service listening on port ${serviceConfig.Port}!`)
  );
  server.on('close', () => {
    blockSyncTask.stop();
    imagePollTask.stop();
  });
  Logger.log('Management service starting..');
  return server;
}
