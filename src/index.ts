import { ServiceConfiguration } from './data-types';
import { Processor } from './processor';
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { errorString } from './utils';
import { TaskLoop } from './task-loop';
import { StateManager } from './model/manager';
import { BlockSync } from './ethereum/block-sync';
import { getVirtualChainManagement } from './api/processor-vc';
import { ImagePoll } from './dockerhub/image-poll';

function wrapAsync(fn: RequestHandler): RequestHandler {
    return (req, res, next) => fn(req, res, next).catch(next);
}

export function serve(serviceConfig: ServiceConfiguration) {
    const processor = new Processor(serviceConfig);
    const state = new StateManager();
    const blockSync = new BlockSync(state, serviceConfig);
    const imagePoll = new ImagePoll(state, serviceConfig);

    const app = express();
    app.get(
        '/node/management',
        wrapAsync(async (_request, response) => {
            const snapshot = state.getCurrentSnapshot();
            const body = await processor.getNodeManagementConfiguration(snapshot);
            response.status(200).json(body);
        })
    );
    app.get('/vchains/:vchainId/management', (request, response) => {
        const { vchainId } = request.params;
        const snapshot = state.getCurrentSnapshot();
        const body = getVirtualChainManagement(vchainId, snapshot);
        response.status(200).json(body);
    });
    app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        if (error instanceof Error) {
            if (serviceConfig.verbose) {
                console.log(`Error response to ${req.url} : ${errorString(error)}`);
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
        console.log(`Management service listening on port ${serviceConfig.Port}!`)
    );
    server.on('close', () => {
        blockSyncTask.stop();
        imagePollTask.stop();
    });
    console.log('Management service starting..');
    return server;
}
