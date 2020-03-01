import { createServer, ServerResponse } from 'http';
import fetch from 'node-fetch';

export interface Config {
    ethereumEndpoint: string;
    configUrl: string;
}

async function proxy(config: Config, response: ServerResponse) {
    const res = await fetch(config.configUrl);
    const body = await res.text();

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(body);
}

export function serve(port: number, config: Config) {
    const server = createServer((_request, response) => {
        proxy(config, response).catch(console.error);
    });
    server.listen(port);
    console.log('Server starting..');
    return server;
}

export function hello(name: string) {
    return { message: `hello ${name}` };
}
