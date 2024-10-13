import _ from 'lodash';
import { EventFetcher } from './event-fetcher';
import { EventData } from 'web3-eth-contract';
import { EventName } from './types';
import { EthereumReader } from './ethereum-reader';
import * as Logger from '../logger';

export interface AutoscaleOptions {
  initialPageSize: number; // the initial window size (max blocks in batch)
  maxPageSize: number; // max possible window size (since it's autoscaling)
  minPageSize: number; // min possible window size (since it's autoscaling)
  pageGrowFactor: number; // by how much should the window grow when attempting to grow
  pageGrowAfter: number; // after how many consecutive successes should we attempt to grow
  pageShrinkFactor: number; // by how much should the window shrink after a failure
}

// more efficient fetcher that supports lookahead
// works with constant page size, which needs to be improved
export class LookaheadEventFetcher extends EventFetcher {
  protected lookAhead: EventData[] = [];
  protected lookAheadFromBlock = 0;
  protected lookAheadToBlock = 0;
  protected currentPageSize = 0;
  protected autoscale: AutoscaleOptions;
  protected autoscaleStreak = 0;

  static DefaultAutoscaleOptions: AutoscaleOptions = {
    initialPageSize: 500000,
    maxPageSize: 5000000,
    minPageSize: 1000,
    pageGrowFactor: 2,
    pageGrowAfter: 5,
    pageShrinkFactor: 2,
  };

  constructor(eventName: EventName, reader: EthereumReader, autoscaleOptions?: Partial<AutoscaleOptions>) {
    super(eventName, reader);
    this.autoscale = {
      ...LookaheadEventFetcher.DefaultAutoscaleOptions,
      ...autoscaleOptions,
    };
  }

  async fetchBlock(blockNumber: number, latestAllowedBlock: number): Promise<EventData[]> {
    // replace lookAhead with a new page if we're outside the lookAhead bounds
    if (!(blockNumber >= this.lookAheadFromBlock && blockNumber <= this.lookAheadToBlock)) {
      await this.downloadNewPage(blockNumber, latestAllowedBlock);
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

  // replace lookAhead entirely with a new page
  protected async downloadNewPage(blockNumber: number, latestAllowedBlock: number) {
    if (this.currentPageSize == 0) this.currentPageSize = this.autoscale.initialPageSize;
    let successful = false;
    let consecutiveFailures = 0;
    while (!successful) {
      try {
        const fromBlock = blockNumber;
        const toBlock = Math.min(blockNumber + this.currentPageSize, latestAllowedBlock);
        this.lookAhead = await this.reader.getPastEvents(this.eventName, { fromBlock, toBlock }, this.contract);
        this.lookAheadFromBlock = fromBlock;
        this.lookAheadToBlock = toBlock;
        // success
        successful = true;
        // autoscale up
        this.autoscaleStreak++;
        if (this.autoscaleStreak >= this.autoscale.pageGrowAfter) {
          this.currentPageSize = Math.round(this.currentPageSize * this.autoscale.pageGrowFactor);
          if (this.currentPageSize > this.autoscale.maxPageSize) this.currentPageSize = this.autoscale.maxPageSize;
          Logger.log(`LookaheadEventFetcher for ${this.eventName}: success, page size is now ${this.currentPageSize}.`);
          this.autoscaleStreak = 0;
        }
      } catch (err) {
        // autoscale down
        this.currentPageSize = Math.round(this.currentPageSize / this.autoscale.pageShrinkFactor);
        if (this.currentPageSize < this.autoscale.minPageSize) this.currentPageSize = this.autoscale.minPageSize;
        Logger.log(`LookaheadEventFetcher for ${this.eventName}: failure, page size is now ${this.currentPageSize}.`);
        this.autoscaleStreak = 0;
        // failure
        consecutiveFailures++;
        // handle optimal page steady-state (it will try to grow and shrink back down)
        if (consecutiveFailures >= 2) throw err;
      }
    }
  }
}
