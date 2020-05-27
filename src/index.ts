import { ServiceConfiguration } from './data-types';
import { Processor } from './processor';
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { errorString } from './utils';
import { getNewEthereumReader } from './ethereum-reader';
import { EthereumModel } from './eth-model';
import { TaskLoop } from './task-loop';

function wrapAsync(fn: RequestHandler): RequestHandler {
    return (req, res, next) => fn(req, res, next).catch(next);
}

export function serve(serviceConfig: ServiceConfiguration) {
    const ethReader = getNewEthereumReader(serviceConfig);
    const ethModel = new EthereumModel(ethReader, serviceConfig);
    const processor = new Processor(serviceConfig, ethModel);

    const app = express();
    app.get(
        '/node/management',
        wrapAsync(async (_request, response) => {
            const body = await processor.getNodeManagementConfiguration();
            response.status(200).json(body);
        })
    );

    app.get(
        '/vchains/:vchainId/management',
        wrapAsync(async (request, response) => {
            const { vchainId } = request.params;
            const body = await processor.getVirtualChainConfiguration(vchainId);
            response.status(200).json(body);
        })
    );
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
    const pollEvents = new TaskLoop(() => ethModel.pollEvents(), serviceConfig.pollIntervalSeconds * 1000);
    pollEvents.start();
    const server = app.listen(serviceConfig.Port, '0.0.0.0', () =>
        console.log(`Management service listening on port ${serviceConfig.Port}!`)
    );
    server.on('close', pollEvents.stop);
    console.log('Management service starting..');
    return server;
}
