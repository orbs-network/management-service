import Web3 from 'web3';
import { Contract, PastEventOptions } from 'web3-eth-contract';
import { toNumber, DailyStats } from '../helpers';
import { EventName, contractByEventName, getAbiForContract } from './types';
import pThrottle from 'p-throttle';
import fetch from 'node-fetch';
import https from 'https';

const HTTP_TIMEOUT_SEC = 20;

const subDomain =  'eth-api'
const domain = 'orbs.network' 

export type EthereumConfiguration = {
  EthereumEndpoint: string;
  EthereumRequestsPerSecondLimit: number;
};

export class EthereumReader {
  private web3: Web3;
  private throttled?: pThrottle.ThrottledFunction<[], void>;
  private agent: https.Agent;
  private blockTimeSinceFail: number;

  public requestStats = new DailyStats();

  constructor(config: EthereumConfiguration) {
    this.agent = new https.Agent({
      maxSockets: 5,
    });
    this.blockTimeSinceFail = 0;
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

  // orbs GET api dediated to serve block time from cache
  // for faster sync time
  

  async getBlockTime(blockNumber: number | 'latest'): Promise<number | null> {    
    const url = `https://${subDomain}.${domain}/api/blocktime?block=${blockNumber}`    
    try {
      const res = await fetch(url, {
        timeout: HTTP_TIMEOUT_SEC * 1000,
        agent: this.agent,
        headers:{
          "x-module":"management-service"
        }            
      });
      if (res.status >= 400){
        console.error("getBlockTime fetch Error status", res.status)  
        return null;
      }
      const text = await res.text();
      const time = Number(text)
      if(isNaN(time)){      
        return null;
      }      
      return time;
    }catch(err){
      console.error("getBlockTime Error:", err)
      return null;
    }
  }
  async getRefTime(blockNumber: number | 'latest'): Promise<number> {

    // get from cache first
    const shouldTry = (this.blockTimeSinceFail == 0 || this.blockTimeSinceFail > 5)
    if (blockNumber !== 'latest' && shouldTry){
      this.blockTimeSinceFail = 0;
      const blocktime = await this.getBlockTime(blockNumber)
      if(blocktime)
        return blocktime
    }
    console.log('getBlockTime failed', blockNumber)
    // count calls web3 provider
    this.blockTimeSinceFail++;

    // fallback to web3
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
