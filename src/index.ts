import { ServiceConfiguration } from './data-types';
import { Processor } from './processor';
import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { errorString } from './utils';

function wrapAsync(fn: RequestHandler): RequestHandler {
    return (req, res, next) => fn(req, res, next).catch(next);
}

export function serve(serviceConfig: ServiceConfiguration) {
    const processor = new Processor(serviceConfig);
    // const configPoller = setInterval(() => {
    //     boyarBootstrap = Processor.getBoyarConfiguration(serviceConfig);
    // }, serviceConfig.pollIntervalSeconds * 1000);
    const app = express();
    app.get(
        '/node/management',
        wrapAsync(async (_request, response) => {
            const body = await processor.getNodeManagementConfiguration();
            response.status(200).json(body);
        })
    );
    app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
        if (error instanceof Error) {
            return res.status(500).json({
                status: 'error',
                error: errorString(error),
            });
        }
        return next(error);
    });
    const server = app.listen(serviceConfig.Port, '0.0.0.0', () =>
        console.log(`Management service listening on port ${serviceConfig.Port}!`)
    );
    // server.on('close', () => clearInterval(configPoller));
    console.log('Management service starting..');
    return server;
}
