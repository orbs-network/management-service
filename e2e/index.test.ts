import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';

const pathToCompose = join(__dirname, 'docker-compose.yml');
const pathToExpected = join(__dirname, 'expected.json');

const env = new TestEnvironment(pathToCompose);

env.init();

test.serial('[E2E] serves boyarLegacyBootstrap according to config', async t => {
    t.timeout(60 * 1000);
    const res = await env.fetch('app');

    const expectedValue = JSON.parse(readFileSync(pathToExpected).toString());

    t.deepEqual(res, expectedValue);
});
