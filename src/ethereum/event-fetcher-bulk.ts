import { EventFetcher } from './event-fetcher';
import { EventData } from 'web3-eth-contract';
import * as Logger from '../logger';

// the current fetcher we use in production, implemented by Ron
export class BulkEventFetcher extends EventFetcher {
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
      throw new Error(
        `Unexpected error - trying to read events in an empty block range: ${options.fromBlock} - ${options.toBlock}.`
      );
    }

    // read events TODO this may break when there are a few thousands
    const events = await this.reader.getPastEvents(this.eventName, options);
    Logger.log(`Fetched ${this.eventName} events for block height ${options.fromBlock} - ${options.toBlock}.`);

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
