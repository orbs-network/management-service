import { fetchDockerHubToken, DockerHubRepo } from 'docker-hub-utils';
import fetch from 'node-fetch';
import { isValid, compare } from './versioning';
import { DockerConfig, ServiceConfiguration, LegacyBoyarBootstrapInput, BoyarConfigurationOutput } from './data-types';

export type LatestTagResult = Promise<string | undefined>;
export class Processor {
    static getBoyarConfiguration(config: ServiceConfiguration): Promise<BoyarConfigurationOutput> {
        return new Processor().getBoyarConfiguration(config);
    }
    static async fetchLatestTagElement(repository: { name: string; user: string }): LatestTagResult {
        const token = await fetchDockerHubToken(repository as DockerHubRepo);
        const res = await fetch(`https://registry.hub.docker.com/v2/${repository.user}/${repository.name}/tags/list`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        const textRes = await res.text();
        const body = JSON.parse(textRes);
        const tags = body?.tags;
        if (tags && Array.isArray(tags) && tags.every(t => typeof t === 'string')) {
            const versions = tags.filter(isValid).sort(compare);
            if (versions.length) {
                return versions[0];
            }
        }
        return; // undefined
    }

    private static async fetchJson(boyarLegacyBootstrap: string) {
        const res = await fetch(boyarLegacyBootstrap);
        const body = await res.text();
        return JSON.parse(body);
    }

    private cache = new Map<string, LatestTagResult>();
    async updateDockerConfig<I extends string>(dc: DockerConfig<I>): Promise<DockerConfig<I>> {
        if (!this.cache.has(dc.Image)) {
            const [user, name] = dc.Image.split('/');
            this.cache.set(dc.Image, Processor.fetchLatestTagElement({ user, name }));
        }
        const tag = await this.cache.get(dc.Image);
        if (typeof tag === 'string') {
            return { ...dc, Tag: tag, Pull: true };
        }
        return dc;
    }

    async getBoyarConfiguration(config: ServiceConfiguration): Promise<BoyarConfigurationOutput> {
        const nodeConfiguration = await this.getLegacyBoyarBootstrap(config);
        return {
            network: nodeConfiguration.network || [],
            orchestrator: this.makeOrchestratorConfig(nodeConfiguration),
            chains: await this.makeChainsConfig(nodeConfiguration),
            services: await this.makeServicesConfig(config)
        };
    }

    private async makeServicesConfig(config: ServiceConfiguration): Promise<BoyarConfigurationOutput['services']> {
        return {
            'management-service': {
                ExternalPort: 7666,
                Port: 8080,
                DockerConfig: await this.updateDockerConfig({
                    Image: 'orbsnetwork/management-service',
                    Tag: 'G-0-N'
                }),
                Config: config
            }
        };
    }

    private makeChainsConfig(
        nodeConfiguration: LegacyBoyarBootstrapInput
    ): Promise<BoyarConfigurationOutput['chains']> {
        return Promise.all(
            nodeConfiguration.chains.map(async c => ({
                ...c,
                DockerConfig: await this.updateDockerConfig(c.DockerConfig)
            }))
        );
    }

    private makeOrchestratorConfig(
        nodeConfiguration: LegacyBoyarBootstrapInput
    ): BoyarConfigurationOutput['orchestrator'] {
        return Object.assign({}, nodeConfiguration.orchestrator, {
            DynamicManagementConfig: {
                Url: 'http:/localhost:7666/node/management',
                ReadInterval: '1m',
                ResetTimeout: '30m'
            }
        });
    }

    private async getLegacyBoyarBootstrap(config: ServiceConfiguration): Promise<LegacyBoyarBootstrapInput> {
        const legacyBoyarBootstrap: LegacyBoyarBootstrapInput = await Processor.fetchJson(config.boyarLegacyBootstrap);
        return Object.assign(
            {
                orchestrator: {},
                chains: []
            },
            legacyBoyarBootstrap
        );
    }
}
