import nock from 'nock';
import { DeploymentDescriptor } from './deployment-descriptor';

export function nockDeploymentManifestJson(desc: DeploymentDescriptor, times = 1) {
  let registryScope = nock('https://deployment.orbs.network'); // expect manifest
  registryScope = registryScope
    .log(console.log)
    .get(`/mainnet.json`) // for each repo
    .times(times)
    .reply(200, desc);

  return registryScope;
}
