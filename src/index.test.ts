import test from 'ava';
import { getNodeConfiguration } from './index';
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

    const result = await getNodeConfiguration({
        boyarLegacyBootstrap: congigUri + configPath
    });

    t.deepEqual(result, body);
    scope.done();
});
