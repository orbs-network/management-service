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
export class PagedEventFetcher extends EventFetcher {
  // store events before they are read
  private eventsStore: { [blockHeight: number]: EventData[] } = {};

  // latest block height fetched
  private latestRead = -1;

  // assuming the caller calls fetchBlock for each consecutive block number exactly once and does not skip or go back
  async fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]> {
    if (latestAllowedBlock < this.latestRead) {
      throw new Error(`latestAllowedBlock (${latestAllowedBlock}) is behind latestFetchedBlock (${this.latestRead}).`);
    }

    // blockNumber already read
    if (this.latestRead >= blockNumber) {
      return this.removeStored(blockNumber);
    }

    // skipping forward (TODO this may leak memory - clear storage!)
    this.latestRead = Math.max(this.latestRead, blockNumber - 1);

    const options = {
      fromBlock: this.latestRead + 1,
      toBlock: latestAllowedBlock,
    };

    if (options.fromBlock > options.toBlock) {
      throw new Error(`Unexpected error - trying to read events in an empty block range: ${options.fromBlock} - ${options.toBlock}.`);
    }

    // read events in pages
    const events = await this.reader.getPastEventsAutoPaged(this.eventName, options);
    Logger.log(`Fetched ${this.eventName} events for block height ${options.fromBlock} - ${options.toBlock}`);

    // process result
    const result = this.extractResultAndStorePrefetched(events, blockNumber);
    this.latestRead = options.toBlock;

    return result;
  }

  private removeStored(blockNumber: number) {
    const prefetchedEvents = this.eventsStore[blockNumber];
    delete this.eventsStore[blockNumber];
    return prefetchedEvents || [];
  }

  private extractResultAndStorePrefetched(events: EventData[], blockNumber: number): EventData[] {
    const result: EventData[] = [];
    events.map((e: EventData) => {
      if (e.blockNumber == blockNumber) {
        result.push(e);
      } else {
        const storedEvents = this.eventsStore[e.blockNumber] || [];
        this.eventsStore[e.blockNumber] = storedEvents;
        storedEvents.push(e);
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
