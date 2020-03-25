import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { getExpected } from './expected';
import { subscriptionChangedEvents, createVC } from '@orbs-network/orbs-ethereum-contracts-v2';
import { isErrorResponse } from '../src/data-types';

const pathToCompose = join(__dirname, 'docker-compose.yml');

const env = new TestEnvironment(pathToCompose);

env.init();

const numberOfVirtualChains = 5;
let vChainIds: string[] = [];
test.serial.before('creating virtual chains', async t => {
    t.timeout(60 * 1000);
    for (let i = 0; i < numberOfVirtualChains; i++) {
        const newVcEvents = await createVC(env.contractsDriver);
        const vcId = subscriptionChangedEvents(newVcEvents).map(e => e.vcid)[0];
        vChainIds.push((vcId as unknown) as string);
        await new Promise(res => setTimeout(res, 100));
    }
});

test.serial('[E2E] serves boyar endpoint as expected', async t => {
    t.timeout(60 * 1000);
    t.deepEqual(vChainIds.length, numberOfVirtualChains, 'all VCs created before test begins');

    let res = await env.fetch('app');

    while (!res || isErrorResponse(res)) {
        t.log('error response', res);
        await new Promise(res => setTimeout(res, 1000));
        t.log('polling again');
        res = await env.fetch('app');
    }

    const expectedValue = getExpected(env.getAppConfig(), vChainIds);

    t.deepEqual(res, expectedValue);
});
