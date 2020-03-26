import { createServer, RequestListener } from 'http';
import { ServiceConfiguration, isErrorResponse } from './data-types';
import { Processor } from './processor';

export function serve(port: number, serviceConfig: ServiceConfiguration) {
    let boyarBootstrap: Promise<object> = Promise.resolve({ status: 'loading' });
    try {
        boyarBootstrap = Processor.getBoyarConfiguration(serviceConfig);
    } catch (e) {
        boyarBootstrap = Promise.resolve({ status: 'error', error: e });
    }
    const configPoller = setInterval(() => {
        boyarBootstrap = Processor.getBoyarConfiguration(serviceConfig);
    }, serviceConfig.pollIntervalSeconds * 1000);
    const server = createServer((async (request, response) => {
        request.on('error', (err) => {
            // If we don't have a listener for 'error' event, the error will be thrown
            console.error('request error', err.message, err.stack);
        });
        response.on('error', (err) => {
            // If we don't have a listener for 'error' event, the error will be thrown
            console.error('response error', err.message, err.stack);
        });
        let stage = 0;
        try {
            const body = await boyarBootstrap;
            stage = 1;
            response.writeHead(isErrorResponse(body) ? 500 : 200, { 'Content-Type': 'application/json' });
            stage = 2;
            response.end(JSON.stringify(body));
        } catch (err) {
            console.error(err);
            switch (stage) {
                case 0:
                    response.writeHead(500).end({ status: 'error', error: '' + err, stack: err?.stack });
                    break;
                case 1:
                case 2:
                    response.end({ status: 'error', error: '' + err, stack: err?.stack });
                    break;
            }
        }
    }) as RequestListener);
    server.on('close', () => clearInterval(configPoller));
    server.listen(port, '0.0.0.0');
    console.log('Server starting..');
    return server;
}
