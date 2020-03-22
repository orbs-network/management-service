import test from 'ava';
import { Driver, createVC } from '@orbs-network/orbs-ethereum-contracts-v2';
import { EthereumReader } from './ethereum-reader';
import { getAddresses } from './test-kit';

test.serial('reads VCs from SubscriptionChanged events', async t => {
    t.timeout(60 * 1000);
    const d = await Driver.new();
    const numnberOfVChains = 5;

    for (const _ of new Array(numnberOfVChains)) {
        await createVC(d);
    }

    const reader = new EthereumReader({
        contracts: getAddresses(d),
        firstBlock: 0,
        httpEndpoint: 'http://localhost:7545'
    });

    const vcs = await reader.getAllVirtualChains();
    t.deepEqual(vcs.length, numnberOfVChains, 'number of VChains');
    t.deepEqual(
        vcs,
        [...Array(numnberOfVChains).keys()].map(i => `${i + 1000000}`),
        'exact match of virtual chains IDs. Requires update when contracts change' // fragile, coupled with contract
    );
});
