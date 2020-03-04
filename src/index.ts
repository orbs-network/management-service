import { createServer, RequestListener } from 'http';
import fetch from 'node-fetch';

export interface ServiceConfiguration {
    boyarLegacyBootstrap: string;
}
export function isLegalServiceConfiguration(c: Partial<ServiceConfiguration>): c is ServiceConfiguration {
    return !!c && typeof c.boyarLegacyBootstrap === 'string';
}

export async function getBoyarBootstrap(config: ServiceConfiguration): Promise<object> {
    const res = await fetch(config.boyarLegacyBootstrap);
    const body = await res.text();
    return JSON.parse(body);
}

export function serve(port: number, config: ServiceConfiguration) {
    const server = createServer((async (_request, response) => {
        let stage = 0;
        try {
            const body = await getBoyarBootstrap(config);
            stage = 1;
            response.writeHead(200, { 'Content-Type': 'application/json' });
            stage = 2;
            response.end(JSON.stringify(body));
        } catch (err) {
            console.error(err);
            switch (stage) {
                case 0:
                    response.writeHead(500).end();
                    break;
                case 1:
                case 2:
                    response.end();
                    break;
            }
        }
    }) as RequestListener);
    server.listen(port);
    console.log('Server starting..');
    return server;
}
