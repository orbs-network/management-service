import _ from 'lodash';
import { EventFetcher } from './event-fetcher';
import { EventData } from 'web3-eth-contract';

// more efficient fetcher that supports lookahead
// works with constant page size, which needs to be improved
export class LookaheadEventFetcher extends EventFetcher {
  protected readonly currentPageSize = 100000;
  protected lookAhead: EventData[] = [];
  protected lookAheadFromBlock = 0;
  protected lookAheadToBlock = 0;

  async fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]> {
    if (!(blockNumber >= this.lookAheadFromBlock && blockNumber <= this.lookAheadToBlock)) {
      const fromBlock = blockNumber;
      const toBlock = Math.min(blockNumber + this.currentPageSize, latestAllowedBlock);
      this.lookAhead = await this.reader.getPastEvents(this.eventName, { fromBlock, toBlock }, this.contract);
      this.lookAheadFromBlock = fromBlock;
      this.lookAheadToBlock = toBlock;
    }
    return _.filter(this.lookAhead, (event) => event.blockNumber == blockNumber);
  }

  setContractAddress(address: string): boolean {
    const changed = super.setContractAddress(address);
    if (changed) {
      // clear lookAhead if we change contracts
      this.lookAhead = [];
      this.lookAheadFromBlock = 0;
      this.lookAheadToBlock = 0;
    }
    return changed;
  }
}
