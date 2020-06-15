import { ServiceConfiguration } from './config';
import express, { Request, Response, NextFunction } from 'express';
import { errorString } from './helpers';
import { TaskLoop } from './task-loop';
import { StateManager } from './model/manager';
import { BlockSync } from './ethereum/block-sync';
import { ImagePoll } from './dockerhub/image-poll';
import { renderNodeManagement } from './api/render-node';
import { renderVirtualChainManagement } from './api/render-vc';
import { renderServiceStatus } from './api/render-status';
import * as Logger from './logger';

// function wrapAsync(fn: RequestHandler): RequestHandler {
//   return (req, res, next) => fn(req, res, next).catch(next);
// }

export function serve(serviceConfig: ServiceConfiguration) {
  const state = new StateManager();
  const blockSync = new BlockSync(state, serviceConfig);
  const imagePoll = new ImagePoll(state, serviceConfig);

  const app = express();
  app.set('json spaces', 2);

  app.get('/node/management', (_request, response) => {
    const snapshot = state.getCurrentSnapshot();
    const body = renderNodeManagement(snapshot, serviceConfig);
    response.status(200).json(body);
  });

  app.get('/vchains/:vchainId/management', (request, response) => {
    const { vchainId } = request.params;
    const snapshot = state.getCurrentSnapshot();
    const body = renderVirtualChainManagement(parseInt(vchainId), snapshot, serviceConfig);
    response.status(200).json(body);
  });

  app.get('/vchains/:vchainId/management/:time', (request, response) => {
    const { vchainId, time } = request.params;
    const snapshot = state.getHistoricSnapshot(parseInt(time));
    const body = renderVirtualChainManagement(parseInt(vchainId), snapshot, serviceConfig);
    response.status(200).json(body);
  });

  app.get('/status', (_request, response) => {
    const snapshot = state.getCurrentSnapshot();
    const body = renderServiceStatus(snapshot, serviceConfig);
    response.status(200).json(body);
  });

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error) {
      if (serviceConfig.Verbose) {
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
