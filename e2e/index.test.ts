import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { getExpected } from './expected';

const pathToCompose = join(__dirname, 'docker-compose.yml');
const pathToExpected = join(__dirname, 'expected.json');

const env = new TestEnvironment(pathToCompose);

const ready = env.init();
test.serial.before(() => ready);

test.serial('[E2E] serves boyarLegacyBootstrap according to config', async t => {
    t.timeout(60 * 1000);
    const res = await env.fetch('app');

    const expectedValue = getExpected(env.getAppConfig());

    t.deepEqual(res, expectedValue);
});
