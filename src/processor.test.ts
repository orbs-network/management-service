import test from 'ava';
import { Processor } from './processor';
import nock from 'nock';
import { DockerConfig } from './data-types';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

function nockDockerHub(...repositories: { user: string; name: string; tags: string[] }[]) {
    nock(/docker/); // prevent requests to docker domain from goinig to network
    nock('https://auth.docker.io') // allow asking for token from auth
        .get(/token/)
        .times(repositories.length) // once per repo
        .reply(200, { token: 'token placeholder' });

    let registryScope = nock('https://registry.hub.docker.com'); // expect polling tags list
    for (const repository of repositories) {
        registryScope = registryScope
            .get(`/v2/${repository.user}/${repository.name}/tags/list`) // for each repo
            .reply(200, { tags: repository.tags });
    }
    return registryScope;
}

test.serial('fetchLatestTagElement gets latest tag from docker hub', async t => {
    const repository = { user: 'orbsnetwork', name: 'node' };
    const tags = [
        'audit', // not a legal semver
        'foo1.2.0', // not a legal semver
        'v1.1.0-tag', // a legal semver, but pre-release
        'v1.0.10', // the latest legal semver
        'v1.0.9', // a legal semver, but not latest
        '0432a81f' // not a legal semver
    ];
    const scope = nockDockerHub({ ...repository, tags });
    const tag = await Processor.fetchLatestTagElement(repository);
    t.deepEqual(tag, 'v1.0.10');
    scope.done();
});

test.serial('updateDockerConfig updates tags with minimal requests', async t => {
    const originalConfiguration = [
        {
            Image: 'foo/bar',
            Tag: 'foo1'
        },
        {
            Image: 'foo/bar',
            Tag: '4.5.6'
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3'
        }
    ] as DockerConfig[];
    const scope = nockDockerHub({ user: 'foo', name: 'bar', tags: ['1.2.3'] }, { user: 'fizz', name: 'baz', tags: [] });
    const processor = new Processor();
    const newConfig = await Promise.all(originalConfiguration.map(dc => processor.updateDockerConfig(dc)));

    t.deepEqual(newConfig, [
        {
            Image: 'foo/bar',
            Tag: '1.2.3',
            Pull: true
        },
        {
            Image: 'foo/bar',
            Tag: '1.2.3',
            Pull: true
        },
        {
            Image: 'fizz/baz',
            Tag: 'foo3'
        }
    ] as DockerConfig[]);

    scope.done();
});
