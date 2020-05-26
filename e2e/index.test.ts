import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { getBoyarConfigValidator, getOngConfigValidator } from './config-validate';
import {
    createVC,
    Driver,
    subscriptionChangedEvents,
} from '@orbs-network/orbs-ethereum-contracts-v2';
import { isErrorResponse } from '../src/data-types';
import { addParticipant } from '../src/pos-v2-simulations';

const pathToCompose = join(__dirname, 'docker-compose.yml');

const env = new TestEnvironment(pathToCompose);

env.init();

const numberOfVirtualChains = 3;
let vChainIds: string[] = [];
test.serial.before('creating virtual chains', async (t) => {
    t.timeout(60 * 1000);
    for (let i = 0; i < numberOfVirtualChains; i++) {
        const newVcEvents = await createVC(env.contractsDriver);
        const vcId = subscriptionChangedEvents(newVcEvents).map((e) => e.vcid)[0];
        vChainIds.push((vcId as unknown) as string);
        await new Promise((res) => setTimeout(res, 100));
    }
});

test.serial('[E2E] serves boyar endpoint as expected', async (t) => {
    console.log('[E2E] serves boyar endpoint as expected');
    env.logger = t.log;
    t.timeout(60 * 1000);
    t.deepEqual(vChainIds.length, numberOfVirtualChains, 'all VCs created before test begins');

    const lastBlock = await ganacheGraceBuffer(env.contractsDriver);
    const lastBlockTime = Number(lastBlock.timestamp);

    t.log('lastBlock (with finality grace): ' + lastBlock.number);
    t.log('lastBlockTime (with finality grace): ' + lastBlockTime);

    let res = await env.fetch('app', 8080, 'node/management');

    while (!res || isErrorResponse(res) || res.chains.length < numberOfVirtualChains) {
        t.log('soft error response', res);
        await new Promise((res) => setTimeout(res, 1000));
        t.log('polling again');
        res = await env.fetch('app', 8080, 'node/management');
    }

    const validate = getBoyarConfigValidator(env.getAppConfig(), vChainIds);

    t.deepEqual(validate(res), []);
});

async function ganacheGraceBuffer(d: Driver) {
    await new Promise((res) => setTimeout(res, 5 * 1000)); // wait 5 seconds to give the last block a distinctive timestamp
    const txResult = await d.newSubscriber('defaultTier', 0); // add a block for finality
    return d.web3.eth.getBlock('latest');
}

test.serial('[E2E] serves ONG endpoint as expected', async (t) => {
    console.log('[E2E] serves ONG endpoint as expected');
    env.logger = t.log;
    t.timeout(2.5 * 60 * 1000);
    t.deepEqual(vChainIds.length, numberOfVirtualChains, 'all VCs created before test begins');

    const d = env.contractsDriver;

    const comittyResult = await addParticipant(d, true);
    const participantResult = await addParticipant(d, false);

    t.log('lastFixtureBlock : ' + participantResult.syncTxResult.blockNumber);
    const lastFixtureBlockTime = Number((await d.web3.eth.getBlock(participantResult.syncTxResult.blockNumber)).timestamp);
    t.log('lastFixtureBlockTime : ' + lastFixtureBlockTime);

    const lastBlock = await ganacheGraceBuffer(d);
    const lastBlockTime = Number(lastBlock.timestamp);

    t.log('lastBlock (with finality grace): ' + lastBlock.number);
    t.log('lastBlockTime (with finality grace): ' + lastBlockTime);

    const vcid = vChainIds[0];
    let res = await env.fetch('app', 8080, `vchains/${vcid}/management`);

    // busy wait for service to initialize
    while (!res || isErrorResponse(res)) {
        t.log('soft error response', res);
        await new Promise((res) => setTimeout(res, 1000));
        t.log('polling again');
        res = await env.fetch('app', 8080, `vchains/${vcid}/management`);
    }

    // poll until service is caught up with state
    while (res.CurrentRefTime < lastBlockTime) {
        t.log('not caught up with state', res.CurrentRefTime, lastBlockTime);
        await new Promise((res) => setTimeout(res, 100));
        t.log('polling again');
        res = await env.fetch('app', 8080, `vchains/${vcid}/management`);
        if (!res || isErrorResponse(res)) {
            throw new Error('error response after init: ' + JSON.stringify(res));
        }
    }

    const validate = getOngConfigValidator(vcid, comittyResult, participantResult, d.committeeGeneral.address);
    const errors = validate(res);

    t.deepEqual(errors, []);
});
