import test from 'ava';
import { nockDeploymentManifestJson } from './test-driver';
import { DeploymentDescriptorConfiguration, DockerHubReader } from './dockerhub-reader';
import { DeploymentDescriptor } from './deployment-descriptor';

test.serial('fetchLatestTagElement gets latest tag from docker hub', async (t) => {
  const config: DeploymentDescriptorConfiguration = {
    DeploymentDescriptorUrl: 'https://orbs-network.github.io/mainnet-deployment/manifest.json',
  };
  const reader = new DockerHubReader(config);
  const deploymentDescriptor: DeploymentDescriptor = {
    Desc: 'Stable and Canary versions for Orbs network',
    SchemaVersion: 1,
    ImageVersions: {
      'management-service-bootstrap': {
        image: 'orbsnetworkstaging/management-service:experimental',
        comment: 'for use by a node deployment/installation tool',
      },
      'management-service': { image: 'orbsnetworkstaging/management-service:experimental' },
      node: { image: 'orbsnetwork/node:v2.0.15' },
      'node-canary': { image: 'orbsnetwork/node:v2.0.16' },
      signer: { image: 'orbsnetwork/signer:v2.3.0' },
      'ethereum-writer': { image: 'orbsnetwork/ethereum-writer:v1.2.5' },
      'logs-service': { image: 'orbsnetwork/logs-service:v1.1.4' },
    },
  };

  const scope = nockDeploymentManifestJson(deploymentDescriptor);
  const latestVersion = await reader.fetchLatestVersion('node');
  t.is(latestVersion['main'], 'orbsnetwork/node:v2.0.15');
  t.is(latestVersion['canary'], 'orbsnetwork/node:v2.0.16');
  scope.done();
});
