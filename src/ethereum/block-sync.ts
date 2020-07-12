import _ from 'lodash';
import { StateManager } from '../model/manager';
import { EthereumReader, EthereumConfiguration, getNewEthereumReader } from './ethereum-reader';
import { SingleEventFetcher, EventFetcher } from './event-fetcher';
import { EventName, eventNames } from './types';
import * as Logger from '../logger';

export type BlockSyncConfiguration = EthereumConfiguration & {
  FinalityBufferBlocks: number;
  EthereumFirstBlock: number;
};

export class BlockSync {
  private reader: EthereumReader;
  private lastProcessedBlock: number;
  private eventFetchers: { [T in EventName]: EventFetcher };

  constructor(private state: StateManager, private config: BlockSyncConfiguration) {
    this.reader = getNewEthereumReader(config);
    this.lastProcessedBlock = config.EthereumFirstBlock;
    this.eventFetchers = {
      GuardianCommitteeChange: new SingleEventFetcher('GuardianCommitteeChange', this.reader),
      StakeChanged: new SingleEventFetcher('StakeChanged', this.reader),
      SubscriptionChanged: new SingleEventFetcher('SubscriptionChanged', this.reader),
      ProtocolVersionChanged: new SingleEventFetcher('ProtocolVersionChanged', this.reader),
      GuardianDataUpdated: new SingleEventFetcher('GuardianDataUpdated', this.reader),
      GuardianStatusUpdated: new SingleEventFetcher('GuardianStatusUpdated', this.reader),
    };
    // TODO: this mechanism is ugly on purpose and stems from us not tracking ContractAddressUpdatedEvent with an EventFetcher
    // The fix to the architecture is:
    // 1. Create an EventFetcher instance that tracks the ContractRegistry and applies the addresses to state
    // 2. EventFetcher.fetchBlock(contractAddress, ...) should receive contractAddress:string on every call
    // 3. State initialization should store the ContractRegistry address from config in the state
    // 4. EventFetcher.fetchBlock calls should rely on addresses from state
    // 5. Remove all the current Contract initialization/connect code from ethereum-reader.ts
    // 6. Remove the ugly line of code below
    this.reader
      .getContractAddresses()
      .then((contractAddresses) => {
        this.state.getCurrentSnapshot().CurrentContractAddress = contractAddresses;
      })
      .catch((err) => {
        Logger.error(`Cannot get contract addresses: ${err.msg}.`);
      });
    Logger.log(`BlockSync: initialized with first block ${this.lastProcessedBlock}.`);
  }

  // single tick of the run loop
  async run() {
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
    this.state.applyNewTimeRef(blockTime, blockNumber);
    Logger.log(`BlockSync: processed ${sorted.length} events in block ${blockNumber} with time ${blockTime}.`);
  }
}
