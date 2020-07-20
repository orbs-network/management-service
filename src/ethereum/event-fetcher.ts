import _ from 'lodash';
import { EventData } from 'web3-eth-contract';
import { EventName } from './types';
import { EthereumReader } from './ethereum-reader';
import * as Logger from '../logger';

export abstract class EventFetcher {
  constructor(protected eventName: EventName, protected reader: EthereumReader) {}
  abstract async fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]>;
}

// TODO: handle changes in registry contract

// the simplest fetcher, yet inefficient, good for testing
export class SingleEventFetcher extends EventFetcher {
  async fetchBlock(blockNumber: number): Promise<EventData[]> {
    return await this.reader.getPastEvents(this.eventName, {
      fromBlock: blockNumber,
      toBlock: blockNumber,
    });
  }
}

// the simplest fetcher, yet inefficient, good for testing
export class InfiniteMemoryFetcher extends EventFetcher {
  private eventsByBlockNumber: { [blockHeight: number]: EventData[] } = {};
  private latestFetched = -1;
  async fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]> {
    if (latestAllowedBlock < this.latestFetched) {
      throw new Error(
        `latestAllowedBlock (${latestAllowedBlock}) is behind latestFetchedBlock (${this.latestFetched}).`
      );
    }

    if (this.latestFetched >= blockNumber) {
      const prefetchedEvents = this.eventsByBlockNumber[blockNumber];
      delete this.eventsByBlockNumber[blockNumber];
      return prefetchedEvents || [];
    }

    const events = await this.reader.getPastEvents(this.eventName, {
      fromBlock: Math.max(this.latestFetched + 1, blockNumber),
      toBlock: latestAllowedBlock,
    });
    this.latestFetched = latestAllowedBlock;
    Logger.log(
      `Fetched past events for ${this.eventName} between heights ${this.latestFetched + 1} - ${latestAllowedBlock}`
    );

    const result: EventData[] = [];
    events.map((e: EventData) => {
      if (e.blockNumber == blockNumber) {
        result.push(e);
      } else {
        const events = this.eventsByBlockNumber[e.blockNumber] || [];
        this.eventsByBlockNumber[e.blockNumber] = events;
        events.push(e);
      }
    });

    return result;
  }
}

// more efficient fetcher that supports lookahead
export class LookaheadEventFetcher extends EventFetcher {
  private readonly lookAheadSize = 50000;
  private readonly currentPageSize = 10000;
  private lookAhead: EventData[] = [];
  private latestBlockInLookahead = 0;
  private fetchingPromise: Promise<unknown> | null = null;

  async fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]> {
    do {
      // check if we need to fill the lookahead buffer (in background)
      if (
        this.lookAhead.length < this.lookAheadSize &&
        this.fetchingPromise == null &&
        latestAllowedBlock > this.latestBlockInLookahead
      ) {
        const fromBlock = this.latestBlockInLookahead + 1;
        const toBlock = Math.min(this.latestBlockInLookahead + this.currentPageSize, latestAllowedBlock);
        this.fetchingPromise = this.reader
          .getPastEventsAutoPaged(this.eventName, { fromBlock, toBlock })
          .then((results) => {
            this.lookAhead = _.concat(this.lookAhead, results);
            this.latestBlockInLookahead = toBlock;
            this.fetchingPromise = null;
          });
      }
      // wait until it's full enough (in foreground)
      if (this.latestBlockInLookahead < blockNumber) await this.fetchingPromise;
    } while (this.latestBlockInLookahead < blockNumber);
    // done
    return _.remove(this.lookAhead, (event) => event.blockNumber == blockNumber);
  }
}
