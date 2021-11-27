import fetch from 'node-fetch';
import https from 'https';
import { DeploymentDescriptor, services } from './deployment-descriptor';

const FETCH_TIMEOUT_SEC = 45;

export type DeploymentDescriptorConfiguration = {
  DeploymentDescriptorUrl: string;
};

export class DockerHubReader {
  private agent: https.Agent;

  constructor(private config: DeploymentDescriptorConfiguration) {
    this.agent = new https.Agent({
      maxSockets: 5,
    });
  }

  async fetchLatestDeploymentDescriptor(): Promise<DeploymentDescriptor> {
    const response = await fetch(this.config.DeploymentDescriptorUrl, {
      timeout: FETCH_TIMEOUT_SEC * 1000,
      agent: this.agent,
    });
    return response.json();
  }

  // TODO use fetchLatestDeploymentDescriptor instead or cache the json
  async fetchLatestVersion(repositoryName: services): Promise<{ [RolloutGroup: string]: string }> {
    const res: { [RolloutGroup: string]: string } = {};
    const response = await fetch(this.config.DeploymentDescriptorUrl, {
      timeout: FETCH_TIMEOUT_SEC * 1000,
      agent: this.agent,
    });
    const body: DeploymentDescriptor = await response.json();

    if (body.ImageVersions[repositoryName]?.image) {
      res['main'] = body.ImageVersions[repositoryName]!.image;
    }

    if (repositoryName == 'node' && body.ImageVersions['node-canary']?.image) {
      res['canary'] = body.ImageVersions['node-canary']?.image;
    }

    // TODO where do we check that 1) the tag is well formed 2) the tag exists
    return res;
  }
}
