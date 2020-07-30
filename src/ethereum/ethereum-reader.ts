import Web3 from 'web3';
import { Contract, PastEventOptions } from 'web3-eth-contract';
import { compiledContracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/compiled-contracts';
import { errorString, toNumber, DailyStats } from '../helpers';
import { EventName, EventTypes, getContractTypeName, contractByEventName } from './types';
import * as Logger from '../logger';

export type EthereumConfiguration = {
  EthereumEndpoint: string;
};

export class EthereumReader {
  private web3: Web3;
  public requestStats = new DailyStats();

  constructor(config: EthereumConfiguration) {
    this.web3 = new Web3(
      new Web3.providers.HttpProvider(config.EthereumEndpoint, {
        keepAlive: true,
      })
    );
  }

  getBlockNumber(): Promise<number> {
    this.requestStats.add(1);
    return this.web3.eth.getBlockNumber();
  }

  async getRefTime(blockNumber: number | 'latest'): Promise<number> {
    this.requestStats.add(1);
    const block = await this.web3.eth.getBlock(blockNumber);
    if (!block) {
      throw new Error(`web3.eth.getBlock for ${blockNumber} return empty block.`);
    }
    return toNumber(block.timestamp);
  }

  getContractForEvent(eventName: EventName, address: string): Contract {
    const contractName = contractByEventName(eventName);
    const abi = compiledContracts[getContractTypeName(contractName)].abi;
    return new this.web3.eth.Contract(abi, address);
  }

  // throws error if fails, caller needs to decrease page size if needed
  async getPastEvents(eventName: EventName, { fromBlock, toBlock }: PastEventOptions, contract?: Contract) {
    if (!contract) return [];
    this.requestStats.add(1);
    return contract.getPastEvents(eventName, {
      fromBlock,
      toBlock,
    });
  }

  // if fails tries to decrease page size with multiple requests until it works
  // TODO: retire this function since auto page logic will move to event-fetcher
  // This function is not tested and has bugs in edge conditions (eg. fromBlock == toBlock)
  async getPastEventsAutoPagedDeprecated(
    eventName: EventName,
    { fromBlock, toBlock }: PastEventOptions,
    contract?: Contract
  ) {
    if (!contract) return [];
    return await this._getEventsPaged(contract, eventName, fromBlock, toBlock, toBlock - fromBlock);
  }

  // TODO: retire this function since auto page logic will move to event-fetcher
  // This function is not tested and has bugs in edge conditions (eg. fromBlock == toBlock)
  async _getEventsPaged<T extends EventName>(
    web3Contract: Contract,
    eventName: string,
    fromBlock: number,
    toBlock: number,
    pageSize: number
  ): Promise<Array<EventTypes[T]>> {
    const result: Array<EventTypes[T]> = [];
    for (let currBlock = fromBlock; currBlock < toBlock; currBlock += pageSize) {
      const options = {
        fromBlock: currBlock,
        toBlock: Math.min(currBlock + pageSize, toBlock),
      };
      try {
        this.requestStats.add(1);
        const events = (await web3Contract.getPastEvents(eventName, options)) as Array<EventTypes[T]>;
        result.push(...events);
      } catch (err) {
        Logger.log(`Soft failure reading blocks [${fromBlock}-${toBlock}] for ${eventName}: ${errorString(err)}.`);
        if (pageSize > 5) {
          // assume there are too many events
          const events = await this._getEventsPaged<T>(
            web3Contract,
            eventName,
            options.fromBlock,
            options.toBlock,
            Math.floor(pageSize / 5)
          );
          result.push(...events);
        } else throw err;
      }
    }
    return result;
  }
}
