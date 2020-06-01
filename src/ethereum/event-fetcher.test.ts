import test from 'ava';
import _ from 'lodash';
import { PastEventOptions } from 'web3-eth-contract';
import { SingleEventFetcher, LookaheadEventFetcher } from './event-fetcher';
import { EventName } from './events-types';
import { EthereumReader } from './ethereum-reader';

let pstate = 17;
function pseudoRand() {
    return (pstate = (pstate * 48271) % 0x7fffffff);
}

// randomize (stable seed) mock event data to represent ethereum
const mockEventsData: MockEvent[] = [];
populateEventsData();
function populateEventsData() {
    let lastBlock = 1;
    for (let i = 0; i < 1000; i++) {
        const numEvents = 1 + (pseudoRand() % 3);
        for (let j = 0; j < numEvents; j++) {
            mockEventsData.push({
                blockNumber: lastBlock,
                uniqueId: i * 10 + j,
            });
        }
        lastBlock += 1 + (pseudoRand() % 200);
    }
}
const mockEventsDataLastBlock = mockEventsData[mockEventsData.length - 1].blockNumber;

interface MockEvent {
    blockNumber: number;
    uniqueId: number;
}

class MockEthereumReader {
    constructor(private delays: boolean) {}
    async getPastEventsAutoPaged(_en: EventName, { fromBlock, toBlock }: PastEventOptions): Promise<Array<MockEvent>> {
        const res = _.filter(mockEventsData, (event) => event.blockNumber >= fromBlock && event.blockNumber <= toBlock);
        if (this.delays) await new Promise((resolve) => setTimeout(resolve, 1)); // sleep 1 ms
        return res;
    }
    async getPastEvents(_en: EventName, { fromBlock, toBlock }: PastEventOptions): Promise<Array<MockEvent>> {
        const res = _.filter(mockEventsData, (event) => event.blockNumber >= fromBlock && event.blockNumber <= toBlock);
        if (this.delays) await new Promise((resolve) => setTimeout(resolve, 1)); // sleep 1 ms
        return res;
    }
}

function getMockReader(delays: boolean): EthereumReader {
    return (new MockEthereumReader(delays) as unknown) as EthereumReader;
}

test('SingleEventFetcher sanity', async (t) => {
    const fetcher = new SingleEventFetcher('ValidatorRegistered', getMockReader(true));
    t.deepEqual(await fetcher.fetchBlock(1), [
        { blockNumber: 1, uniqueId: 0 },
        { blockNumber: 1, uniqueId: 1 },
        { blockNumber: 1, uniqueId: 2 },
    ] as unknown);
});

test('LookaheadEventFetcher sanity', async (t) => {
    const fetcher = new LookaheadEventFetcher('ValidatorRegistered', getMockReader(true));
    t.deepEqual(await fetcher.fetchBlock(1, 999999), [
        { blockNumber: 1, uniqueId: 0 },
        { blockNumber: 1, uniqueId: 1 },
        { blockNumber: 1, uniqueId: 2 },
    ] as unknown);
});

let resContract: unknown = [];
test.before(async () => {
    const fetcher = new SingleEventFetcher('ValidatorRegistered', getMockReader(false));
    for (let blockNumber = 1; blockNumber < mockEventsDataLastBlock; blockNumber++) {
        resContract = _.concat(resContract, await fetcher.fetchBlock(blockNumber));
    }
});

test('LookaheadEventFetcher contract test', async (t) => {
    let resFetcher: unknown = [];
    const fetcher = new LookaheadEventFetcher('ValidatorRegistered', getMockReader(true));
    for (let blockNumber = 1; blockNumber < mockEventsDataLastBlock; blockNumber++) {
        resFetcher = _.concat(resFetcher, await fetcher.fetchBlock(blockNumber, 999999));
    }

    t.deepEqual(resFetcher, resContract);
});

// TODO: add test to verify fetcher doesn't look beyond latestAllowedBlock
//  so fetch once, then change the model and fetch again to see the new value is returned
