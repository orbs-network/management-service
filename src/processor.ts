import { fetchDockerHubToken, DockerHubRepo } from 'docker-hub-utils';
import fetch from 'node-fetch';
import semver from 'semver';
import { DockerConfig } from './data-types';

export type LatestTagResult = Promise<string | undefined>;
export class Processor {
    static async fetchLatestTagElement(repository: { name: string; user: string }): LatestTagResult {
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

    private cache = new Map<string, LatestTagResult>();
    async updateDockerConfig(dc: DockerConfig): Promise<DockerConfig> {
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
}
