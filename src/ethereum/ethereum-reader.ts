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
let timer: NodeJS.Timeout | null = null;

export type EthereumConfiguration = {
  EthereumEndpoint: string[];
  EthereumRequestsPerSecondLimit: number;
};

export class EthereumReader {
  private currentWeb3Index = 0;
  private web3s: Web3[];
  private throttled?: pThrottle.ThrottledFunction<[], void>;
  private agent: https.Agent;
  private blockTimeSinceFail: number;
  private resetContracts : Function;

  public requestStats = new DailyStats();

  constructor(config: EthereumConfiguration, resetContracts: Function) {
    this.agent = new https.Agent({
      maxSockets: 5,
    });
    this.resetContracts = resetContracts;
    this.blockTimeSinceFail = 0;

    this.web3s = config.EthereumEndpoint.map(endpoint => new Web3(
      new Web3.providers.HttpProvider(endpoint, {
        keepAlive: true,
        timeout: HTTP_TIMEOUT_SEC * 1000,
      })
    ));

    if (config.EthereumRequestsPerSecondLimit > 0) {
      this.throttled = pThrottle(() => Promise.resolve(), config.EthereumRequestsPerSecondLimit, 1000);
    }
  }

  getWeb3(): Web3 {
    //console.log ('getWeb3: returning web3 to ' + this.web3s[this.currentWeb3Index], 'index:', this.currentWeb3Index);
    return this.web3s[this.currentWeb3Index];
  }

  switchWeb3() {
    this.currentWeb3Index = (this.currentWeb3Index + 1) % this.web3s.length;

    const currentProvider = this.getWeb3().eth.currentProvider;
    if (currentProvider instanceof Web3.providers.HttpProvider) {
        console.log ('switchWeb3: switching to web3 to ' + currentProvider.host);
    }
    this.resetContracts();

    if (this.currentWeb3Index != 0) {
      if (timer!=null) { // clear any old timer if exist.
        clearTimeout (timer);
      }

      timer = setTimeout(() => { // set a timer to switch back to the first provider.
        this.currentWeb3Index = 0;
        console.log('switchWeb3: switching to web3 to first provider.');
        this.resetContracts();
        }, 60000 * 10); // after 10 minutes, return to the first web3
    }
  }

  async getBlockNumber(): Promise<number> {
    if (this.throttled) await this.throttled();
    this.requestStats.add(1);

    try {
      return await this.getWeb3().eth.getBlockNumber();
    } catch (error) {
      console.error("Error fetching block number:", error);
      this.switchWeb3();
      return await this.getWeb3().eth.getBlockNumber();
    }
  }

  // orbs GET api dediated to serve block time from cache
  // for faster sync time
  

  async getBlockTime(blockNumber: number): Promise<number | null> {    
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

  calcSecondsAgo (time: number): number {
    return Math.floor((Date.now() / 1000) - time)
  }

  async getRefTime(blockNumber: number | 'latest'): Promise<number> {
    // get from cache first
    const shouldTry = (this.blockTimeSinceFail == 0 || this.blockTimeSinceFail > 5)
    if (blockNumber !== 'latest' && shouldTry) {
      this.blockTimeSinceFail = 0;
      const blocktime = await this.getBlockTime(blockNumber)
      if (blocktime) {
        return blocktime
      }
    }
    console.log('getBlockTime failed', blockNumber)
    // count calls web3 provider
    this.blockTimeSinceFail++;

    // fallback to web3
    if (this.throttled) await this.throttled();
    this.requestStats.add(1);

    let block
    try {
      block = await this.getWeb3().eth.getBlock(blockNumber);
    } catch (error) {
      console.error("Error fetching block number:", error);
      this.switchWeb3();
      block = await this.getWeb3().eth.getBlock(blockNumber);
    }

    if (!block) {
      throw new Error(`web3.eth.getBlock for ${blockNumber} return empty block.`);
    }
    return toNumber(block.timestamp);
  }

  getContractForEvent(eventName: EventName, address: string): Contract {
    const contractName = contractByEventName(eventName);
    const abi = getAbiForContract(address, contractName);

    try {
      const web3instance = this.getWeb3();
      return new web3instance.eth.Contract(abi, address);
    } catch (error) {
      console.error("Error fetching contract:", error);
      this.switchWeb3();
      const web3instance = this.getWeb3();
      return new web3instance.eth.Contract(abi, address);
      //return new this.getWeb3().eth.Contract(abi, address);
    }
  }

  // throws error if fails, caller needs to decrease page size if needed
  async getPastEvents(eventName: EventName, { fromBlock, toBlock }: PastEventOptions, contract?: Contract) {
    if (!contract) return [];
    if (this.throttled) await this.throttled();
    this.requestStats.add(1);

    try {
      return contract.getPastEvents(eventName, {
        fromBlock,
        toBlock
      });
    } catch (e) {
      console.error("Error fetching past events:", e);
      this.switchWeb3();
      return contract.getPastEvents(eventName, {
        fromBlock,
        toBlock
      });
    }
  }
}
