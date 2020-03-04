import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';

const pathToCompose = join(__dirname, 'docker-compose.yml');
const pathToConfig = join(__dirname, 'config.json');

const env = new TestEnvironment(pathToCompose);

env.init();

test.serial('[E2E] serves boyarLegacyBootstrap according to config', async t => {
    t.timeout(60 * 1000);
    const res = await env.fetch('app');

    const config = JSON.parse(readFileSync(pathToConfig).toString());
    const expectedValue = await (await fetch(config.boyarLegacyBootstrap)).json();

    t.deepEqual(res, expectedValue);
});
