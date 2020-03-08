import test from 'ava';
import { getBoyarBootstrap, isLegalServiceConfiguration, fetchLatestTagElement } from './index';
import nock from 'nock';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

test.serial('polls boyarLegacyBootstrap according to config', async t => {
    const congigUri = 'https://s3.amazonaws.com';
    const configPath = '/orbs-bootstrap-prod/boyar/config.json';
    const body: object = { placeholder: 'hello world' };

    const scope = nock(congigUri)
        .get(configPath)
        .reply(200, body);

    const result = await getBoyarBootstrap({
        boyarLegacyBootstrap: congigUri + configPath
    });

    t.deepEqual(result, body);
    scope.done();
});

test('accepts legal config', t => {
    t.true(
        isLegalServiceConfiguration({
            boyarLegacyBootstrap: 'https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json',
            pollIntervalSeconds: 0.1
        })
    );
});

function nockDockerHub(repository: { user: string; name: string; tags: string[] }) {
    nock(/docker/); // prevent requests to docker domain from goinig out
    nock('https://auth.docker.io')
        .get(/token/)
        .reply(200, { token: 'token placeholder' }); // allow asking for token from auth
    const scope = nock('https://registry.hub.docker.com')
        .get(`/v2/${repository.user}/${repository.name}/tags/list`)
        .reply(200, { tags: repository.tags });
    return scope;
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
    const tag = await fetchLatestTagElement(repository);
    t.deepEqual(tag, 'v1.0.10');
    scope.done();
});
