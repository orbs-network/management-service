import fetch from 'node-fetch';
import https from 'https';

const FETCH_TIMEOUT_SEC = 45;

export type DeploymentDescriptorConfiguration = {
  DeploymentDescriptorUrl: string;
};

export type services =
  | 'management-service-bootstrap'
  | 'management-service'
  | 'matic-reader'
  | 'signer'
  | 'ethereum-writer'
  | 'matic-writer'
  | 'logs-service'
  | 'node'
  | 'node-canary';

export type DeploymentDescriptor = {
  Desc?: string;
  SchemaVersion: number | string;
  ImageVersions: {
    [serviceName in services]?: {
      image: string;
      comment?: string;
    };
  };
};

export class DeploymentDescriptorReader {
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

  async fetchLatestVersion(
    serviceNames: services[]
  ): Promise<{ [serviceName: string]: { [RolloutGroup: string]: string } }> {
    const res: { [serviceName: string]: { [RolloutGroup: string]: string } } = {};

    const body: DeploymentDescriptor = await this.fetchLatestDeploymentDescriptor();

    for (const serviceName of serviceNames) {
      const imageResult: { [RolloutGroup: string]: string } = {};
      if (body.ImageVersions[serviceName]?.image) {
        imageResult['main'] = body.ImageVersions[serviceName]!.image;
      }

      if (serviceName == 'node' && body.ImageVersions['node-canary']?.image) {
        imageResult['canary'] = body.ImageVersions['node-canary']?.image;
      }
      res[serviceName] = imageResult;
    }

    return res;
  }
}
