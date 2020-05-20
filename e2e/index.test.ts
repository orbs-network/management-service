import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { getBoyarConfigValidator, getOngConfigValidator } from './config-validate';
import {
    createVC,
    subscriptionChangedEvents,
    topologyChangedEvents,
    committeeChangedEvents,
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
    t.timeout(60 * 1000);
    t.deepEqual(vChainIds.length, numberOfVirtualChains, 'all VCs created before test begins');

    let res = await env.fetch('app', 8080, 'node/management');

    while (!res || isErrorResponse(res) || res.chains.length < numberOfVirtualChains) {
        t.log('error response', res);
        await new Promise((res) => setTimeout(res, 1000));
        t.log('polling again');
        res = await env.fetch('app', 8080, 'node/management');
    }

    const validate = getBoyarConfigValidator(env.getAppConfig(), vChainIds);

    t.deepEqual(validate(res), []);
});

test.serial('[E2E] serves ONG endpoint as expected', async (t) => {
    t.timeout(60 * 1000);
    t.deepEqual(vChainIds.length, numberOfVirtualChains, 'all VCs created before test begins');

    const d = env.contractsDriver;

    const comittyResult = await addParticipant(d, true);
    const participantResult = await addParticipant(d, false);
    await new Promise((res) => setTimeout(res, 5 * 1000)); // wait 5 seconds to give the last block a distinctive timestamp
    const newVcEvents = await createVC(env.contractsDriver); // extra VC to force a new block
    const topologyEvent = topologyChangedEvents(participantResult.validatorTxResult)[0];
    const comittyEvent = committeeChangedEvents(comittyResult.commiteeTxResult)[0];
    const lastBlockTime = +(await d.web3.eth.getBlock(newVcEvents.blockNumber)).timestamp;

    const vcid = vChainIds[0];
    let res = await env.fetch('app', 8080, `vchains/${vcid}/management`);

    while (!res || isErrorResponse(res) || res.CurrentRefTime < lastBlockTime) {
        t.log('soft error response', res);
        await new Promise((res) => setTimeout(res, 1000));
        t.log('polling again');
        t.log('lastBlockTime', lastBlockTime);
        res = await env.fetch('app', 8080, `vchains/${vcid}/management`);
    }

    const validate = getOngConfigValidator(vcid, topologyEvent, comittyEvent);
    const errors = validate(res);

    t.deepEqual(errors, []);
});
