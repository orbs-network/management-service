import { ServiceConfiguration } from './config';
import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import cors from 'cors';
import { errorString } from './helpers';
import { TaskLoop } from './task-loop';
import { StateManager } from './model/manager';
import { BlockSync } from './ethereum/block-sync';
import { ImagePoll } from './deployment/image-poll';
import { renderNodeManagement } from './api/render-node';
import { renderServiceStatus, renderServiceStatusAnalytics } from './api/render-status';
import * as Logger from './logger';
import { StatusWriter } from './status-writer';

const SOCKET_TIMEOUT_SEC = 60;

// function wrapAsync(fn: RequestHandler): RequestHandler {
//   return (req, res, next) => fn(req, res, next).catch(next);
// }

export function serve(serviceConfig: ServiceConfiguration, censoredConfig: ServiceConfiguration) {
  const state = new StateManager(serviceConfig);
  const blockSync = new BlockSync(state, serviceConfig);
  const imagePoll = new ImagePoll(state, serviceConfig);
  const statusWriter = new StatusWriter(state, censoredConfig);

  const app = express();
  app.use(cors());
  app.set('json spaces', 2);

  app.get('/node/management', (_request, response) => {
    const snapshot = state.getCurrentSnapshot();
    const body = renderNodeManagement(snapshot, serviceConfig);
    response.status(200).json(body);
  });

  app.get('/status', (_request, response) => {
    const snapshot = state.getCurrentSnapshot();
    const body = renderServiceStatus(snapshot, blockSync.getRequestStats(), serviceConfig);
    response.status(200).json(body);
  });

  app.get('/analytics', compression(), (_request, response) => {
    const snapshot = state.getCurrentSnapshot();
    const body = renderServiceStatusAnalytics(snapshot, blockSync.getRequestStats(), serviceConfig);
    response.status(200).json(body);
  });

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error) {
      Logger.error(`Error response to ${req.url}: ${errorString(error)}.`);
      return res.status(500).json({
        status: 'error',
        error: errorString(error),
      });
    }
    return next(error);
  });

  const blockSyncTask = new TaskLoop(() => blockSync.run(), serviceConfig.EthereumPollIntervalSeconds * 1000);
  const imagePollTask = new TaskLoop(
    () => imagePoll.run(),
    serviceConfig.DeploymentDescriptorPollIntervalSeconds * 1000
  );
  const statusWriterTask = new TaskLoop(
    () => statusWriter.run(blockSync.getRequestStats()),
    serviceConfig.StatusWriteIntervalSeconds * 1000
  );
  blockSyncTask.start();
  imagePollTask.start();
  statusWriterTask.start();

  const server = app.listen(serviceConfig.Port, '0.0.0.0', () =>
    Logger.log(`Management service listening on port ${serviceConfig.Port}!`)
  );
  server.setTimeout(SOCKET_TIMEOUT_SEC * 1000);
  server.requestTimeout = SOCKET_TIMEOUT_SEC * 1000;
  server.on('close', () => {
    blockSyncTask.stop();
    imagePollTask.stop();
    statusWriterTask.stop();
  });
  return server;
}
