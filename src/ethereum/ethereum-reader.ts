import Web3 from 'web3';
import { Contract, PastEventOptions } from 'web3-eth-contract';
import { toNumber, DailyStats } from '../helpers';
import { EventName, contractByEventName, getAbiForContract } from './types';
import pThrottle from 'p-throttle';

const HTTP_TIMEOUT_SEC = 20;

export type EthereumConfiguration = {
  EthereumEndpoint: string;
  EthereumRequestsPerSecondLimit: number;
};

export class EthereumReader {
  private web3: Web3;
  private throttled?: pThrottle.ThrottledFunction<[], void>;
  public requestStats = new DailyStats();

  constructor(config: EthereumConfiguration) {
    this.web3 = new Web3(
      new Web3.providers.HttpProvider(config.EthereumEndpoint, {
        keepAlive: true,
        timeout: HTTP_TIMEOUT_SEC * 1000,
      })
    );
    if (config.EthereumRequestsPerSecondLimit > 0) {
      this.throttled = pThrottle(() => Promise.resolve(), config.EthereumRequestsPerSecondLimit, 1000);
    }
  }

  async getBlockNumber(): Promise<number> {
    if (this.throttled) await this.throttled();
    this.requestStats.add(1);
    return this.web3.eth.getBlockNumber();
  }

  async getRefTime(blockNumber: number | 'latest'): Promise<number> {
    if (this.throttled) await this.throttled();
    this.requestStats.add(1);
    const block = await this.web3.eth.getBlock(blockNumber);
    if (!block) {
      throw new Error(`web3.eth.getBlock for ${blockNumber} return empty block.`);
    }
    return toNumber(block.timestamp);
  }

  getContractForEvent(eventName: EventName, address: string): Contract {
    const contractName = contractByEventName(eventName);
    const abi = getAbiForContract(address, contractName);
    return new this.web3.eth.Contract(abi, address);
  }

  // throws error if fails, caller needs to decrease page size if needed
  async getPastEvents(eventName: EventName, { fromBlock, toBlock }: PastEventOptions, contract?: Contract) {
    if (!contract) return [];
    if (this.throttled) await this.throttled();
    this.requestStats.add(1);
    return contract.getPastEvents(eventName, {
      fromBlock,
      toBlock,
    });
  }
}
