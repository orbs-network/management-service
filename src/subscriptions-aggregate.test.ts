import test from 'ava';
import { Driver, createVC } from '@orbs-network/orbs-ethereum-contracts-v2';
import { subscriptionChangedEvents } from '@orbs-network/orbs-ethereum-contracts-v2/release/test/event-parsing';

test.serial('reads VCs from SubscriptionChanged events', async t => {
    t.timeout(60 * 1000);
    const d = await Driver.new();
    const numnberOfVChains = 5;

    for (const _ of new Array(numnberOfVChains)) {
        const r = await createVC(d);
        const events = subscriptionChangedEvents(r);
        // expect(r).to.have.subscriptionChangedEvent();
        console.log('events', events);
    }

    const events = await d.subscriptions.web3Contract.getPastEvents('SubscriptionChanged', {
        fromBlock: 0,
        toBlock: 'latest'
    });
    const vcs = events.map(event => event.returnValues.vcid);
    t.deepEqual(vcs.length, numnberOfVChains);
});

// async function getEventsPaged(
//   contract: Contract,
//   eventType: string,
//   fromBlock: number,
//   toBlock: number,
//   pageSize: number
// ): Promise<Array<EventData>> {
//   const result: Array<EventData> = [];
//   for (let currBlock = fromBlock; currBlock < toBlock; currBlock += pageSize) {
//     const options = {
//       fromBlock: currBlock,
//       toBlock: Math.min(currBlock + pageSize, toBlock)
//     };
//     try {
//       const events = await contract.getPastEvents(
//         "SubscriptionChanged",
//         options
//       );
//       result.push(...events);
//     } catch (err) {
//       if (pageSize > 5) {
//         // assume there are too many events
//         const events = await getEventsPaged(
//           contract,
//           eventType,
//           options.fromBlock,
//           options.toBlock,
//           Math.floor(pageSize / 5)
//         );
//         result.push(...events);
//       } else throw err;
//     }
//   }
//   return result;
// }
