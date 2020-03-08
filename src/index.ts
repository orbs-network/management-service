import { createServer, RequestListener } from 'http';
import { fetchDockerHubToken, DockerHubRepo } from 'docker-hub-utils';
import fetch from 'node-fetch';
import semver from 'semver';

export interface ServiceConfiguration {
    boyarLegacyBootstrap: string;
    pollIntervalSeconds: number;
}
export function isLegalServiceConfiguration(c: Partial<ServiceConfiguration>): c is ServiceConfiguration {
    return (
        !!c &&
        typeof c.boyarLegacyBootstrap === 'string' &&
        typeof c.pollIntervalSeconds == 'number' &&
        !Number.isNaN(c.pollIntervalSeconds)
    );
}

export async function getBoyarBootstrap({ boyarLegacyBootstrap }: { boyarLegacyBootstrap: string }): Promise<object> {
    return await fetchJson(boyarLegacyBootstrap); // TODO override with fetchLatestTagElement
}

export type DockerConfig = {
    ContainerNamePrefix: string;
    Image: string;
    Tag: string;
    Pull: boolean;
};

export type LegacyBoyarBootstrap = {
    network: Array<unknown>;
    orchestrator: {
        'storage-driver': string;
        'max-reload-time-delay': string;
    };
    chains: Array<{
        Id: string | number;
        HttpPort: number;
        GossipPort: number;
        DockerConfig: DockerConfig;
        Config: object;
    }>;
};

async function fetchJson(boyarLegacyBootstrap: string) {
    const res = await fetch(boyarLegacyBootstrap);
    const body = await res.text();
    return JSON.parse(body);
}

export async function fetchLatestTagElement(repository: { name: string; user: string }): Promise<string | undefined> {
    const token = await fetchDockerHubToken(repository as DockerHubRepo);
    const res = await fetch(`https://registry.hub.docker.com/v2/${repository.user}/${repository.name}/tags/list`, {
        headers: { Authorization: 'Bearer ' + token }
    });
    const textRes = await res.text();
    const body = JSON.parse(textRes);
    const tags = body?.tags;
    if (tags && Array.isArray(tags) && tags.every(t => typeof t === 'string')) {
        const versions = tags
            .filter(
                version =>
                    semver.valid(version, {
                        loose: true,
                        includePrerelease: false
                    }) && !semver.prerelease(version)
            )
            .sort(semver.rcompare);
        if (versions.length) {
            return versions[0];
        }
    }
    return; // undefined
}

export function serve(port: number, config: ServiceConfiguration) {
    let boyarBootstrap = getBoyarBootstrap(config);
    const configPoller = setInterval(() => {
        boyarBootstrap = getBoyarBootstrap(config);
    }, config.pollIntervalSeconds * 1000);
    const server = createServer((async (_request, response) => {
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
