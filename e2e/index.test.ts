import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { getExpected } from './expected';
import { subscriptionChangedEvents, createVC } from '@orbs-network/orbs-ethereum-contracts-v2';

const pathToCompose = join(__dirname, 'docker-compose.yml');
const pathToExpected = join(__dirname, 'expected.json');

const env = new TestEnvironment(pathToCompose);

env.init();

const numberOfVirtualChains = 5;
let vChainIds: string[] = [];
test.serial.before('creating virtual chains', async t => {
    t.timeout(60 * 1000);
    for (let i = 0; i < numberOfVirtualChains; i++) {
        vChainIds.push(
            (subscriptionChangedEvents(await createVC(env.contractsDriver)).map(e => e.vcid)[0] as unknown) as string
        );
    }
});

test.serial('[E2E] serves boyarLegacyBootstrap according to config', async t => {
    t.timeout(60 * 1000);
    const res = await env.fetch('app');

    const expectedValue = getExpected(env.getAppConfig(), vChainIds);

    t.deepEqual(res, expectedValue);
});
