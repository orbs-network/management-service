import Web3 from 'web3';
import BN from 'bn.js';
import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import {
  evmIncreaseTime,
  evmMine,
} from '@orbs-network/orbs-ethereum-contracts-v2/release/test/helpers';
import { DriverOptions } from '@orbs-network/orbs-ethereum-contracts-v2/release/test/driver';
import { toNumber } from '../helpers';
import { ContractName } from './types';

const SCENARIO_MAX_COMMITTEE_SIZE = 2;

export class EthereumTestDriver {
  private orbsPosV2Driver?: Driver;

  constructor(public verbose = false) {}

  async deployContracts(customWeb3Provider?: () => Web3) {
    if (this.verbose) console.log(`[posv2] about to deploy contracts`);
    const options: Partial<DriverOptions> = {
      maxCommitteeSize: SCENARIO_MAX_COMMITTEE_SIZE,
    };
    if (customWeb3Provider) options.web3Provider = customWeb3Provider;
    this.orbsPosV2Driver = await Driver.new(options);
    const d = this.orbsPosV2Driver;

    if (this.verbose) console.log(`[posv2] about to deploy subscriber and deployment subset`);
    await d.protocol.createDeploymentSubset('canary', 1, { from: d.functionalManager.address });
  }

  async closeConnections() {
    const provider = this.orbsPosV2Driver?.web3?.currentProvider;
    const hdwalletProvider = provider as unknown as HDWalletProvider;
    if (hdwalletProvider?.engine?.stop) {
      await hdwalletProvider.engine.stop();
    }
    // sleep 2 seconds for connections to close
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  getContractRegistryAddress(): string {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    const res = d.contractRegistry.address;
    if (this.verbose) console.log(`[posv2] contract registry address is ${res}`);
    return res;
  }

  getContractAddress(contractName: ContractName): string {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;
    return d[contractName].address;
  }

  async setupInitialCommittee() {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);

    if (this.verbose) console.log(`[posv2] about to set up initial committee`);
    const v1 = await this.addGuardian(true, '10000000000000000000000');
    const v2 = await this.addGuardian(true, '20000000000000000000000');
    const v3 = await this.addGuardian(false, '30000000000000000000000');
    await this.increaseTime(1000);
    const v4 = await this.addGuardian(true, '40000000000000000000000');
    const v5 = await this.addGuardian(false, '50000000000000000000000');
    await this.increaseTime(1000);
    return { v1, v2, v3, v4, v5 };
  }

  async addGuardian(committee: boolean, stake = '10000') {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    const p = d.newParticipant();
    await p.stake(new BN(stake));
    await p.registerAsGuardian();
    if (committee) {
      await p.readyForCommittee();
    } else {
      await p.readyToSync();
    }
    return p;
  }

  async setGuardianMetadata(guardianAddress: string, key: string, value: string) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;
    await d.guardiansRegistration.setMetadata(key, value, { from: guardianAddress });
  }

  async increaseTime(seconds: number) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    await evmIncreaseTime(d.web3, seconds);
  }

  async increaseBlocks(numBlocks: number) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    await evmMine(d.web3, numBlocks);
  }

  async getCurrentBlock(): Promise<number> {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    return await d.web3.eth.getBlockNumber();
  }

  async getCurrentBlockPreDeploy(ethereumEndpoint: string): Promise<number> {
    const web3 = new Web3(ethereumEndpoint);
    return await web3.eth.getBlockNumber();
  }

  async getCurrentBlockTime(): Promise<number> {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    const block = await d.web3.eth.getBlock('latest');
    return toNumber(block.timestamp);
  }
}

// needed due to missing types
interface HDWalletProvider {
  engine: {
    stop: () => Promise<void>;
  };
}
