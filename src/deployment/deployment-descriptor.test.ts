import test from 'ava';
import { nockDeploymentManifestJson } from './test-driver';
import {
  DeploymentDescriptor,
} from './deployment-descriptor';

test.serial('fetchLatestTagElement gets latest tag from docker hub', async () => {
  const deploymentDescriptor: DeploymentDescriptor = {
    Desc: 'Stable and Canary versions for Orbs network',
    SchemaVersion: 1,
    ImageVersions: {
      'management-service-bootstrap': {
        image: 'orbsnetworkstaging/management-service:experimental',
        comment: 'for use by a node deployment/installation tool',
      },
      'management-service': { image: 'orbsnetworkstaging/management-service:experimental' },
      'matic-reader': { image: 'orbsnetworkstaging/management-service:experimental' },
      signer: { image: 'orbsnetwork/signer:v2.3.0' },
      'ethereum-writer': { image: 'orbsnetwork/ethereum-writer:v1.2.5' },
      'matic-writer': { image: 'orbsnetwork/ethereum-writer:v1.2.5' },
      'logs-service': { image: 'orbsnetwork/logs-service:v1.1.4' },
    },
  };

  const scope = nockDeploymentManifestJson(deploymentDescriptor);

  scope.done();
});
