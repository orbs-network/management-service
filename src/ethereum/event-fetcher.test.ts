/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava';
import _ from 'lodash';
import { PastEventOptions } from 'web3-eth-contract';
import { SingleEventFetcher } from './event-fetcher';
import { BulkEventFetcher } from './event-fetcher-bulk';
import { LookaheadEventFetcher } from './event-fetcher-lookahead';
import { EventName } from './types';
import { EthereumReader } from './ethereum-reader';

class PseudoRand {
  private pstate = 17;
  next() {
    return (this.pstate = (this.pstate * 48271) % 0x7fffffff);
  }
}

function getRandomEvents(uniqeIdOffset = 0): MockEvent[] {
  const rand = new PseudoRand();
  const res: MockEvent[] = [];
  let lastBlock = 1;
  for (let i = 0; i < 1000; i++) {
    const numEvents = 1 + (rand.next() % 3);
    for (let j = 0; j < numEvents; j++) {
      res.push({
        blockNumber: lastBlock,
        uniqueId: i * 10 + j + uniqeIdOffset,
      });
    }
    lastBlock += 1 + (rand.next() % 200);
  }
  return res;
}

interface MockEvent {
  blockNumber: number;
  uniqueId: number;
}

class MockEthereumReader {
  public delays = true;
  constructor(public eventStream: MockEvent[]) {}
  async getPastEvents(_en: EventName, { fromBlock, toBlock }: PastEventOptions) {
    if (!fromBlock || !toBlock) return [];
    const res = _.filter(this.eventStream, (event) => event.blockNumber >= fromBlock && event.blockNumber <= toBlock);
    if (this.delays) await new Promise((resolve) => setTimeout(resolve, 1)); // sleep 1 ms to add scheduling jitter
    return res;
  }
  getContractForEvent(_en: EventName, address: string) {
    return { options: { address } };
  }
}

function getMockReader(eventStream = getRandomEvents()): MockEthereumReader & EthereumReader {
  return new MockEthereumReader(eventStream) as unknown as MockEthereumReader & EthereumReader;
}

// fetcher defaults overrides for tests

LookaheadEventFetcher.DefaultAutoscaleOptions = {
  initialPageSize: 1000,
  maxPageSize: 100000,
  minPageSize: 10,
  pageGrowFactor: 2,
  pageGrowAfter: 5,
  pageShrinkFactor: 2,
};

// sanity tests for all fetchers

for (const fetcherType of [SingleEventFetcher, LookaheadEventFetcher, BulkEventFetcher]) {
  test(`${fetcherType.name} sanity`, async (t) => {
    const reader = getMockReader();
    const fetcher = new fetcherType('GuardianDataUpdated', reader);

    t.deepEqual(await fetcher.fetchBlock(1, 999999), [
      { blockNumber: 1, uniqueId: 0 },
      { blockNumber: 1, uniqueId: 1 },
      { blockNumber: 1, uniqueId: 2 },
    ] as unknown);
  });
}

// test changing addresses in the middle for all fetchers

for (const fetcherType of [SingleEventFetcher, LookaheadEventFetcher /*BulkEventFetcher*/]) {
  test(`${fetcherType.name} changes address mid-sync`, async (t) => {
    const reader = getMockReader();
    const fetcher = new fetcherType('GuardianDataUpdated', reader);

    reader.eventStream = getRandomEvents(1000);
    fetcher.setContractAddress('0x111');
    t.deepEqual(await fetcher.fetchBlock(1, 999999), [
      { blockNumber: 1, uniqueId: 1000 },
      { blockNumber: 1, uniqueId: 1001 },
      { blockNumber: 1, uniqueId: 1002 },
    ] as unknown);

    reader.eventStream = getRandomEvents(2000);
    fetcher.setContractAddress('0x222');
    t.deepEqual(await fetcher.fetchBlock(53, 999999), [
      { blockNumber: 53, uniqueId: 2010 },
      { blockNumber: 53, uniqueId: 2011 },
      { blockNumber: 53, uniqueId: 2012 },
    ] as unknown);
  });
}

// contract test (over a few thousands of random events) for all fetchers

for (const fetcherType of [LookaheadEventFetcher, BulkEventFetcher]) {
  test(`${fetcherType.name} contract test compared to SingleEventFetcher`, async (t) => {
    const reader = getMockReader();
    const baseline = new SingleEventFetcher('GuardianDataUpdated', reader);
    const fetcher = new fetcherType('GuardianDataUpdated', reader);
    let baselineResult: unknown = [];
    let fetcherResult: unknown = [];

    for (let blockNumber = 1; blockNumber < _.last(reader.eventStream)!.blockNumber; blockNumber++) {
      reader.delays = false; // if we don't disable the delays, SingleEventFetcher is too slow
      baselineResult = _.concat(baselineResult, await baseline.fetchBlock(blockNumber));
      reader.delays = true; // enable the delays again for the efficient fetchers
      fetcherResult = _.concat(fetcherResult, await fetcher.fetchBlock(blockNumber, 999999));
    }
    t.deepEqual(fetcherResult, baselineResult);
  });
}

// TODO: add test to verify fetcher doesn't look beyond latestAllowedBlock
//  so fetch once, then change the model and fetch again to see the new value is returned
