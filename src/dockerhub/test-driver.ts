import nock from 'nock';
import { DeploymentDescriptor } from './deployment-descriptor';

export function nockDeploymentManifestJson(desc: DeploymentDescriptor, times = 1) {
  let registryScope = nock('https://orbs-network.github.io'); // expect manifest
  registryScope = registryScope
    .log(console.log)
    .get(`/mainnet-deployment/manifest.json`) // for each repo
    .times(times)
    .reply(200, desc);

  return registryScope;
}
