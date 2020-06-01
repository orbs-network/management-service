import _ from 'lodash';
import { EventData } from 'web3-eth-contract';
import { EventName } from './events-types';
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
