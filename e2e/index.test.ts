import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { createVC } from '@orbs-network/orbs-ethereum-contracts-v2';
import { readFileSync } from 'fs';

const pathToCompose = join(__dirname, 'docker-compose.yml');
const pathToExpected = join(__dirname, 'expected.json');

const env = new TestEnvironment(pathToCompose);

const ready = env.init();
test.serial.before(() => ready);

test.serial('[E2E] serves boyarLegacyBootstrap according to config', async t => {
    t.timeout(60 * 1000);
    const res = await env.fetch('app');

    const expectedValue = JSON.parse(readFileSync(pathToExpected).toString());
    expectedValue.services['management-service'].Config = env.getAppConfig(); // set correct E2E fixture settings

    t.deepEqual(res, expectedValue);
});
