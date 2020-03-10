import test from 'ava';
import { getNodeConfiguration } from './index';
import nock from 'nock';

test.serial.afterEach.always(() => {
    nock.cleanAll();
});

test.serial('returns ', async t => {
    const congigUri = 'https://s3.amazonaws.com';
    const configPath = '/orbs-bootstrap-prod/boyar/config.json';
    const body: object = { placeholder: 'hello world' };

    const scope = nock(congigUri)
        .get(configPath)
        .reply(200, body);

    const result = await getNodeConfiguration({
        boyarLegacyBootstrap: congigUri + configPath
    });

    t.deepEqual(result, {
        Orchestration: {},
        NodeServices: [
            {
                ExternalPort: 8080,
                InternalPort: 8080,
                DockerConfig: {
                    Image: 'orbsnetwork/management-service',
                    Tag: 'G-0-N'
                },
                Config: {}
            }
        ]
    });
    scope.done();
});
