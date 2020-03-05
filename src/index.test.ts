import test from 'ava';
import { getBoyarBootstrap, isLegalServiceConfiguration, fetchLatestTagElement } from './index';
import nock from 'nock';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

const congigUri = 'https://s3.amazonaws.com';
const configPath = '/orbs-bootstrap-prod/boyar/config.json';
const config = {
    boyarLegacyBootstrap: congigUri + configPath
};
const body: object = { message: 'hello world' };

test.serial('polls boyarLegacyBootstrap according to config', async t => {
    const scope = nock(congigUri)
        .get(configPath)
        .reply(200, body);

    t.deepEqual(await getBoyarBootstrap(config), body);
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

// TODO WIP
test('get latest tag', async t => {
    const tag = await fetchLatestTagElement({ user: 'orbsnetwork', name: 'node' });
    if (!tag) {
        throw new Error('tag not found');
    }
    t.deepEqual(tag, 'v1.3.10');
});
