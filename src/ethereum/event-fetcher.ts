import { EventData } from 'web3-eth-contract';
import { EventName } from './types';
import { EthereumReader } from './ethereum-reader';

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
