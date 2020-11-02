import _ from 'lodash';
import { StateManager } from '../model/manager';
import { EthereumReader, EthereumConfiguration } from './ethereum-reader';
import { EventFetcher } from './event-fetcher';
import { EventName, eventNames, contractByEventName } from './types';
import * as Logger from '../logger';
import { DailyStatsData } from '../helpers';
import { LookaheadEventFetcher } from './event-fetcher-lookahead';

export type BlockSyncConfiguration = EthereumConfiguration & {
  BootstrapMode: boolean;
  FinalityBufferBlocks: number;
  EthereumFirstBlock: number;
};

export class BlockSync {
  private reader: EthereumReader;
  private lastProcessedBlock: number;
  private eventFetchers: { [T in EventName]: EventFetcher };

  constructor(private state: StateManager, private config: BlockSyncConfiguration) {
    this.reader = new EthereumReader(config);
    this.lastProcessedBlock = config.EthereumFirstBlock;
    this.eventFetchers = {
      ContractAddressUpdated: new LookaheadEventFetcher('ContractAddressUpdated', this.reader),
      CommitteeChange: new LookaheadEventFetcher('CommitteeChange', this.reader),
      StakeChanged: new LookaheadEventFetcher('StakeChanged', this.reader),
      SubscriptionChanged: new LookaheadEventFetcher('SubscriptionChanged', this.reader),
      ProtocolVersionChanged: new LookaheadEventFetcher('ProtocolVersionChanged', this.reader),
      GuardianDataUpdated: new LookaheadEventFetcher('GuardianDataUpdated', this.reader),
      GuardianStatusUpdated: new LookaheadEventFetcher('GuardianStatusUpdated', this.reader),
      GuardianMetadataChanged: new LookaheadEventFetcher('GuardianMetadataChanged', this.reader),
      GuardianCertificationUpdate: new LookaheadEventFetcher('GuardianCertificationUpdate', this.reader),
    };
    Logger.log(`BlockSync: initialized with first block ${this.lastProcessedBlock}.`);
  }

  // single tick of the run loop
  async run() {
    if (this.config.BootstrapMode) return; // do nothing in bootstrap mode

    const latestAllowedBlock = await this.getLatestBlockUnderFinality();
    Logger.log(`BlockSync: run started at ${this.lastProcessedBlock} allowed to go to ${latestAllowedBlock}.`);

    // go over blocks one by one and process their events
    while (this.lastProcessedBlock < latestAllowedBlock) {
      await this.processEventsInBlock(this.lastProcessedBlock + 1, latestAllowedBlock);
      this.lastProcessedBlock++;
    }

    // notify state about time of latest block (in case no events in it)
    const latestAllowedBlockTime = await this.reader.getRefTime(latestAllowedBlock);
    this.state.applyNewTimeRef(latestAllowedBlockTime, latestAllowedBlock);
    Logger.log(`BlockSync: run finished processing up to ${latestAllowedBlock} with time ${latestAllowedBlockTime}.`);
  }

  async getLatestBlockUnderFinality(): Promise<number> {
    return (await this.reader.getBlockNumber()) - this.config.FinalityBufferBlocks;
  }

  // Note about tracking changes in contract registry:
  // If contract address was updated in contract registry in the middle of block 1000,
  // we read blocks 1-1000 from old address and blocks 1001+ from the new address.
  // This simplification is ok because contracts will be locked from emitting events during transition.

  async processEventsInBlock(blockNumber: number, latestAllowedBlock: number) {
    // update all contract addresses according to state to track changes in contract registry
    for (const eventName of eventNames) {
      const address = this.state.getCurrentSnapshot().CurrentContractAddress[contractByEventName(eventName)];
      if (address) this.eventFetchers[eventName].setContractAddress(address);
    }

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
    this.state.applyNewTimeRef(blockTime, blockNumber);
    Logger.log(`BlockSync: processed ${sorted.length} events in block ${blockNumber} with time ${blockTime}.`);
  }

  getRequestStats(): DailyStatsData {
    return this.reader.requestStats.getStats();
  }
}
