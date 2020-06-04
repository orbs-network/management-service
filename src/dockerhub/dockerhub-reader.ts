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

  async fetchLatestVersion(repositoryName: string): Promise<{ [RolloutGroup: string]: string }> {
    const res: { [RolloutGroup: string]: string } = {};
    const repository = { user: this.config.DockerNamespace, name: repositoryName };
    const token = await fetchDockerHubToken(repository as DockerHubRepo);
    const response = await fetch(`https://registry.hub.docker.com/v2/${repository.user}/${repository.name}/tags/list`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const text = await response.text();
    const body = JSON.parse(text);
    const tags = body?.tags;
    if (tags && Array.isArray(tags) && tags.every((t) => typeof t === 'string')) {
      const mainVersions = tags.filter(Versioning.isMain).sort(Versioning.compare);
      if (mainVersions.length) {
        res['main'] = mainVersions[mainVersions.length - 1];
      }
      const canaryVersions = tags.filter(Versioning.isCanary).sort(Versioning.compare);
      if (canaryVersions.length) {
        res['canary'] = canaryVersions[canaryVersions.length - 1];
      }
    }
    return res;
  }
}
