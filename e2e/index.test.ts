import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';

const pathToCompose = join(__dirname, 'docker-compose.yml');
const pathToConfig = join(__dirname, "config.json");

const env = new TestEnvironment(pathToCompose);

env.init();

test.serial('happy flow', async t => {
    const res = await env.fetch('app', 7666);

    const config = JSON.parse(readFileSync(pathToConfig).toString());
    const expectedValue = await (await fetch(config.configUrl)).json();

    t.deepEqual(res, expectedValue);
});
