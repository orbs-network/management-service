import fetch from 'node-fetch';
import https from 'https';
import {L3_VM_PREFIX} from "../api/render-status";

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
  | 'node-canary'

export type DeploymentDescriptor = {
  Desc?: string;
  SchemaVersion: number | string;
  ImageVersions: {
    [serviceName: string]: {
      [property: string]: any
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

  parseDescriptor(
    descriptor: DeploymentDescriptor, serviceNames: services[]
  ):{ [serviceName: string]: { [RolloutGroup: string]: string } } {
    const res: { [serviceName: string]: { [RolloutGroup: string]: string } } = {};


    for (const serviceName of serviceNames) {
      const imageResult: { [RolloutGroup: string]: string } = {};
      if (descriptor.ImageVersions[serviceName]?.image) {
        imageResult['main'] = descriptor.ImageVersions[serviceName]!.image;
      }

      if (serviceName == 'node' && descriptor.ImageVersions['node-canary']?.image) {
        imageResult['canary'] = descriptor.ImageVersions['node-canary']?.image;
      }
      res[serviceName] = imageResult;
    }

    // VMs (dynamic loading)
    for (const serviceName in descriptor.ImageVersions) {
      if (serviceName.startsWith(L3_VM_PREFIX)) {
        const imageResult: { [RolloutGroup: string]: string } = {};
        imageResult['main'] = descriptor.ImageVersions[serviceName].image;
        res[serviceName] = imageResult;
      }
    }

    return res;
  }
}
