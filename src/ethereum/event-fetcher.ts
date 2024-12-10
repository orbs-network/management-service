import { EventData } from 'web3-eth-contract';
import { EventName } from './types';
import { EthereumReader } from './ethereum-reader';
import { Contract } from 'web3-eth-contract';

// abstract class all fetchers should extend
export abstract class EventFetcher {
  protected contract?: Contract;
  constructor(protected eventName: EventName, protected reader: EthereumReader) {}

  // returns true if the address changed, override to add handling logic on change
  setContractAddress(address: string): boolean {
    if (address == this.contract?.options.address) return false;
    this.contract = this.reader.getContractForEvent(this.eventName, address);
    return true;
  }

  resetContract() {
    this.contract = undefined;
  }

  // every fetcher instance should override this function
  abstract fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]>;
}

// the simplest fetcher, yet inefficient, good for testing
export class SingleEventFetcher extends EventFetcher {
  async fetchBlock(blockNumber: number): Promise<EventData[]> {
    const fromBlock = blockNumber;
    const toBlock = blockNumber;
    return this.reader.getPastEvents(this.eventName, { fromBlock, toBlock }, this.contract);
  }
}
