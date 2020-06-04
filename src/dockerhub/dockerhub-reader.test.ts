import test from 'ava';
import { nockDockerHub } from './test-driver';
import { DockerHubReader } from './dockerhub-reader';

test.serial('fetchLatestTagElement gets latest tag from docker hub', async (t) => {
  const config = { DockerNamespace: 'orbsnetwork' };
  const reader = new DockerHubReader(config);
  const repository = { user: config.DockerNamespace, name: 'node' };
  const tags = [
    'audit',
    'v0.0.7',
    'v1.1.1',
    'v1.1.0+hotfix',
    'v0.9.9',
    'v0.0.0',
    'v9.9.9 ',
    'v1.2.3-canary',
    'v5.4.3-canary+hotfix',
    'foo v4.0.4 bar',
    'v1.0.10',
    'v9.9.8-canary ',
    'v0.0.1-canary+hotfix',
    '0432a81f',
    'G-0-N',
    'v9.9.9-0432a81f',
  ];
  const scope = nockDockerHub({ ...repository, tags });
  const latestVersion = await reader.fetchLatestVersion(repository.name);
  t.is(latestVersion['main'], 'v1.1.1');
  t.is(latestVersion['canary'], 'v5.4.3-canary+hotfix');
  scope.done();
});
