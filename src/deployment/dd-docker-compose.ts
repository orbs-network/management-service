import axios from 'axios';
import {StateManager} from "../model/manager";
import * as Logger from "../logger";
import { promises as fs } from 'fs';
import yaml from 'js-yaml';

interface DockerComposeService {
  [serviceName: string]: any;
}

export class DockerComposeReader {
  constructor(private state: StateManager) {
    this.state = state;
    Logger.log(`DockerComposeReader: initialized.`);
  }

  async fetchDockerCompose(url: string): Promise<DockerComposeService | null> {
    try {
      // Retrieve the docker-compose.yml file from the remote URL
      const response = await axios.get(url);
      const dockerComposeContent = response.data;

      // Parse the YAML content
      const parsedContent = yaml.load(dockerComposeContent) as any;

      // Extract and return the services
      if (parsedContent && parsedContent.services) {
        return parsedContent.services;
      } else {
        console.error("No services found in docker-compose.yml");
        return null;
      }
    } catch (error) {
      console.error("Error fetching or parsing docker-compose.yml:", error);
      return null;
    }
  }

  async fetchDockerComposeFromLocal (): Promise<DockerComposeService | null> {
    try {
      // Retrieve the docker-compose.yml file from the remote URL
      const dockerComposeContent = await fs.readFile("/opt/orbs/deployment.yml", 'utf-8');

      // Parse the YAML content
      const parsedContent = yaml.load(dockerComposeContent) as any;

      // Extract and return the services
      if (parsedContent && parsedContent.services) {
        return parsedContent.services;
      } else {
        console.error("No services found in docker-compose.yml");
        return null;
      }
    } catch (error) {
      console.error("Error fetching or parsing docker-compose.yml:", error);
      return null;
    }
  }

  async run() {
    //const url = 'https://raw.githubusercontent.com/orbs-network/v3-node-setup/refs/heads/main/deployment/docker-compose.yml'; // Replace with your URL
    //const url = "http://host.docker.internal:4444/docker-compose.yml";
    //const url = this.config.DockerComposeDescriptorUrl;
    const services = await this.fetchDockerComposeFromLocal();
    if (services) {
      Object.keys(services).forEach((serviceName) => {
        this.state.applyNewImageVersion("main", serviceName, services[serviceName].image);
      });
    }
    // Enrich with our new Controller service.

    this.state.applyNewImageVersion("main", "controller", "-");
  }
}
//
// // Usage example
// (async () => {
//   const url = 'https://raw.githubusercontent.com/orbs-network/v3-node-setup/refs/heads/main/deployment/docker-compose.yml'; // Replace with your URL
//   const services = await fetchDockerCompose(url);
//   //console.log("Services:", services);
//   Object.keys(services).forEach((serviceName) => {
//     console.log(serviceName, services[serviceName].image);
//   });
// })();

// import fetch from 'node-fetch';
// import https from 'https';
// import http from "node:http";
//
// const FETCH_TIMEOUT_SEC = 45;
//
// export type DockerComposeDescriptorConfiguration = {
//   DockerComposeUrl: string;
// };
//
// export type services =
//   | 'management-service-bootstrap'
//   | 'management-service'
//   | 'matic-reader'
//   | 'signer'
//   | 'ethereum-writer'
//   | 'matic-writer'
//   | 'logs-service'
//   | 'vm-keepers'
//   | 'vm-notifications'// open defi notification protocol
//   | 'vm-twap' // twap taker
//   | 'vm-lambda'; // twap taker
//
// export type DockerDeploymentDescriptor = {
//   Desc?: string;
//   SchemaVersion: number | string;
//   ImageVersions: {
//     [serviceName in services]?: {
//       image: string;
//       comment?: string;
//     };
//   };
// };
//
// export class DockerComposeDescriptorReader {
//   private agent: http.Agent;
//
//   constructor(private config: DockerComposeDescriptorConfiguration) {
//     if (config.DeploymentDescriptorUrl.startsWith('https://')) {
//       this.agent = new https.Agent({
//         maxSockets: 5,
//       });
//     } else {
//         this.agent = new http.Agent({
//           maxSockets: 5,
//         });
//     }
//   }
//
//   async fetchLatestDeploymentDescriptor(): Promise<DockerDeploymentDescriptor> {
//     const response = await fetch(this.config.DockerComposeUrl {
//       timeout: FETCH_TIMEOUT_SEC * 1000,
//       agent: this.agent,
//     });
//
//     return response.json();
//   }
//
//   async fetchLatestVersion(
//     serviceNames: services[]
//   ): Promise<{ [serviceName: string]: { [RolloutGroup: string]: string } }> {
//     const res: { [serviceName: string]: { [RolloutGroup: string]: string } } = {};
//
//     const body: DockerDeploymentDescriptor = await this.fetchLatestDeploymentDescriptor();
//
//     for (const serviceName of serviceNames) {
//       const imageResult: { [RolloutGroup: string]: string } = {};
//       if (body.ImageVersions[serviceName]?.image) {
//         imageResult['main'] = body.ImageVersions[serviceName]!.image;
//       }
//
//       res[serviceName] = imageResult;
//     }
//
//     return res;
//   }
// }
