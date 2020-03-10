import { createServer, RequestListener } from 'http';
import fetch from 'node-fetch';
import { Processor } from './processor';
import { LegacyBoyarBootstrap, ServiceConfiguration } from './data-types';

export type NodeManagementConfig = {
    Orchestration: object;
    NodeServices: Array<{}>;
    VirtualChains: Array<{}>;
};

export async function getNodeConfiguration({
    boyarLegacyBootstrap
}: {
    boyarLegacyBootstrap: string;
}): Promise<object> {
    const processor = new Processor();
    const nodeConfiguration: LegacyBoyarBootstrap = await fetchJson(boyarLegacyBootstrap);
    const result = { Orchestration: nodeConfiguration.orchestrator } as NodeManagementConfig;
    if (nodeConfiguration.chains) {
        const chains = await Promise.all(
            nodeConfiguration.chains.map(async c => ({
                ...c,
                DockerConfig: await processor.updateDockerConfig(c.DockerConfig)
            }))
        );
        result.VirtualChains = chains;
    }
    result.NodeServices = [
        {
            ExternalPort: 8080,
            InternalPort: 8080,
            DockerConfig: await processor.updateDockerConfig({
                Image: 'orbsnetwork/management-service',
                Tag: 'v1.0.0'
            }),
            Config: {} // TODO pass config here?
        }
    ];
    return nodeConfiguration;
}

async function fetchJson(boyarLegacyBootstrap: string) {
    const res = await fetch(boyarLegacyBootstrap);
    const body = await res.text();
    return JSON.parse(body);
}

export function serve(port: number, config: ServiceConfiguration) {
    let boyarBootstrap = getNodeConfiguration(config);
    const configPoller = setInterval(() => {
        boyarBootstrap = getNodeConfiguration(config);
    }, config.pollIntervalSeconds * 1000);
    const server = createServer((async (request, response) => {
        request.on('error', err => {
            // If we don't have a listener for 'error' event, the error will be thrown
            console.error('request error', err.message, err.stack);
        });
        response.on('error', err => {
            // If we don't have a listener for 'error' event, the error will be thrown
            console.error('response error', err.message, err.stack);
        });
        let stage = 0;
        try {
            const body = await boyarBootstrap;
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
    server.on('close', () => clearInterval(configPoller));
    server.listen(port);
    console.log('Server starting..');
    return server;
}
