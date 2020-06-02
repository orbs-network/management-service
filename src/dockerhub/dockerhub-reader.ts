import { DockerHubRepo, fetchDockerHubToken } from 'docker-hub-utils';
import * as Versioning from './versioning';
import fetch from 'node-fetch';

export type DockerHubConfiguration = {
  DockerNamespace: string;
};

export class DockerHubReader {
  constructor(private config: DockerHubConfiguration) {}

  // TODO: consider switching to API that requires no auth token:
  //  https://registry.hub.docker.com/v2/repositories/orbsnetwork/node/tags/experimental
  //  check what is more likely to exist in private self-hosted docker repos

  async fetchLatestVersion(repositoryName: string): Promise<string | undefined> {
    const repository = { user: this.config.DockerNamespace, name: repositoryName };
    const token = await fetchDockerHubToken(repository as DockerHubRepo);
    const res = await fetch(`https://registry.hub.docker.com/v2/${repository.user}/${repository.name}/tags/list`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const textRes = await res.text();
    const body = JSON.parse(textRes);
    const tags = body?.tags;
    if (tags && Array.isArray(tags) && tags.every((t) => typeof t === 'string')) {
      const versions = tags.filter(Versioning.isValid).sort(Versioning.compare);
      if (versions.length) {
        return versions[versions.length - 1];
      }
    }
    return undefined;
  }
}
