import Web3 from 'web3';
import { Contract, PastEventOptions } from 'web3-eth-contract';
import { compiledContracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/compiled-contracts';
import { toNumber, DailyStats } from '../helpers';
import { EventName, getContractTypeName, contractByEventName } from './types';

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
}
