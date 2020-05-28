import _ from 'lodash';
import { StateManager } from '../model/manager';
import { EthereumReader, ServiceEthereumConfiguration, getNewEthereumReader } from './ethereum-reader';
import { SingleEventFetcher, EventFetcher } from './event-fetcher';
import { EventName, eventNames } from './events-types';

export type BlockSyncConfig = ServiceEthereumConfiguration & {
    finalityBufferBlocks: number;
};

export class BlockSync {
    private reader: EthereumReader;
    private lastProcessedBlock = 0;
    private eventFetchers: { [T in EventName]: EventFetcher };

    constructor(private state: StateManager, private config: BlockSyncConfig) {
        this.reader = getNewEthereumReader(config);
        this.eventFetchers = {
            CommitteeChanged: new SingleEventFetcher('CommitteeChanged', this.reader),
            StandbysChanged: new SingleEventFetcher('StandbysChanged', this.reader),
            SubscriptionChanged: new SingleEventFetcher('SubscriptionChanged', this.reader),
            ProtocolVersionChanged: new SingleEventFetcher('ProtocolVersionChanged', this.reader),
            ValidatorRegistered: new SingleEventFetcher('ValidatorRegistered', this.reader),
        };
    }

    // single tick of the run loop
    async run() {
        const latestAllowedBlock = await this.getLatestBlockUnderFinality();

        // go over blocks one by one and process their events
        while (this.lastProcessedBlock < latestAllowedBlock) {
            await this.processEventsInBlock(this.lastProcessedBlock + 1, latestAllowedBlock);
            this.lastProcessedBlock++;
        }

        // notify state about time of latest block (in case no events in it)
        const latestAllowedBlockTime = await this.reader.getRefTime(latestAllowedBlock);
        this.state.applyNewTimeRef(latestAllowedBlockTime);
    }

    async getLatestBlockUnderFinality(): Promise<number> {
        return (await this.reader.getBlockNumber()) - this.config.finalityBufferBlocks;
    }

    async processEventsInBlock(blockNumber: number, latestAllowedBlock: number) {
        // fetch from all event fetchers
        const promises = eventNames.map((eventName) =>
            this.eventFetchers[eventName].fetchBlock(blockNumber, latestAllowedBlock)
        );
        const events = await Promise.all(promises);
        const sorted = _.sortBy(_.flatten(events), (event) => event.logIndex);

        // only apply to state if we have events in this block
        if (sorted.length == 0) return;
        const blockTime = await this.reader.getRefTime(blockNumber);
        this.state.applyNewEvents(blockTime, sorted);
        this.state.applyNewTimeRef(blockTime);
    }
}
