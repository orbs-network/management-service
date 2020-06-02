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
    'v0.9.9',
    'v0.0.0',
    'v9.9.9 ',
    'foo v4.0.4 bar',
    'v1.0.10',
    '0432a81f',
    'G-0-N',
    'v9.9.9-0432a81f',
  ];
  const scope = nockDockerHub({ ...repository, tags });
  const tag = await reader.fetchLatestVersion(repository.name);
  t.is(tag, 'v1.1.1');
  scope.done();
});
