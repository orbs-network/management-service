import _ from 'lodash';
import { EventFetcher } from './event-fetcher';
import { EventData } from 'web3-eth-contract';

// more efficient fetcher that supports lookahead
// works with constant page size, which needs to be improved
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
          .getPastEventsAutoPagedDeprecated(this.eventName, { fromBlock, toBlock }, this.contract)
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
