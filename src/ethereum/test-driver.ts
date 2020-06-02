import Web3 from 'web3';
import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import {
  evmIncreaseTime,
  evmMine,
  getTopBlockTimestamp,
} from '@orbs-network/orbs-ethereum-contracts-v2/release/test/helpers';
import { DriverOptions } from '@orbs-network/orbs-ethereum-contracts-v2/release/test/driver';
import { MonthlySubscriptionPlanContract } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/monthly-subscription-plan-contract';
import { toNumber } from '../helpers';

const SCENARIO_MAX_STANDBYS = 1;
const SCENARIO_MAX_COMMITTEE_SIZE = 2;
const SUBSCRIPTION_MONTHLY_RATE = 1000;
const SECONDS_IN_MONTH = 30 * 24 * 60 * 60;

export class EthereumTestDriver {
  private orbsPosV2Driver?: Driver;
  private subscriber?: MonthlySubscriptionPlanContract;

  constructor(public verbose = false) {}

  async deployContracts(customWeb3Provider?: () => Web3) {
    if (this.verbose) console.log(`[posv2] about to deploy contracts`);
    const options: Partial<DriverOptions> = {
      maxStandbys: SCENARIO_MAX_STANDBYS,
      maxCommitteeSize: SCENARIO_MAX_COMMITTEE_SIZE,
    };
    if (customWeb3Provider) options.web3Provider = customWeb3Provider;
    this.orbsPosV2Driver = await Driver.new(options);
    if (this.verbose) console.log(`[posv2] about to deploy subscriber`);
    this.subscriber = await this.orbsPosV2Driver.newSubscriber('defaultTier', SUBSCRIPTION_MONTHLY_RATE);
  }

  getContractRegistryAddress(): string {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    const res = d.contractRegistry.address;
    if (this.verbose) console.log(`[posv2] contract registry address is ${res}`);
    return res;
  }

  async setupInitialCommittee() {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);

    if (this.verbose) console.log(`[posv2] about to set up initial committee`);
    const v1 = await this.addValidator(true, 10000);
    const v2 = await this.addValidator(true, 20000);
    const v3 = await this.addValidator(false, 30000);
    await this.increaseTime(1000);
    const v4 = await this.addValidator(true, 40000);
    const v5 = await this.addValidator(false, 50000);
    await this.increaseTime(1000);
    return { v1, v2, v3, v4, v5 };
  }

  async addVchain(timeUntilExpires: number) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    if (!this.subscriber) throw new Error(`Subscriber contract not deployed`);
    const d = this.orbsPosV2Driver;

    if (this.verbose) console.log(`[posv2] about to add vchain`);
    const payment = Math.round(SUBSCRIPTION_MONTHLY_RATE * (timeUntilExpires / SECONDS_IN_MONTH));
    const payerAddress = d.contractsOwner;
    await d.erc20.assign(payerAddress, payment);
    await d.erc20.approve(this.subscriber.address, payment, { from: payerAddress });
    await this.subscriber.createVC(payment, false, 'main', { from: payerAddress });
    await this.increaseTime(1000);
  }

  async extendVchain(vcid: string, timeUntilExpires: number) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    if (!this.subscriber) throw new Error(`Subscriber contract not deployed`);
    const d = this.orbsPosV2Driver;

    if (this.verbose) console.log(`[posv2] about to extend vchain`);
    const payment = Math.round(SUBSCRIPTION_MONTHLY_RATE * (timeUntilExpires / SECONDS_IN_MONTH));
    const payerAddress = d.contractsOwner;
    await d.erc20.assign(payerAddress, payment);
    await d.erc20.approve(this.subscriber.address, payment, { from: payerAddress });
    await this.subscriber.extendSubscription(vcid, payment, { from: payerAddress });
    await this.increaseTime(1000);
  }

  async upgradeProtocolVersion(newVersion: number, timeUntilUpgrade: number) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    if (this.verbose) console.log(`[posv2] about to upgrade protocol version`);
    const currTime: number = await getTopBlockTimestamp(d);
    await d.protocol.setProtocolVersion('main', newVersion, currTime + timeUntilUpgrade);
  }

  async addValidator(committee: boolean, stake = 10000) {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    const p = d.newParticipant();
    await p.stake(stake);
    await p.registerAsValidator();
    if (committee) {
      await p.notifyReadyForCommittee();
    } else {
      await p.notifyReadyToSync();
    }
    return p;
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

  async getCurrentBlockTime(): Promise<number> {
    if (!this.orbsPosV2Driver) throw new Error(`Driver contracts not deployed`);
    const d = this.orbsPosV2Driver;

    const block = await d.web3.eth.getBlock('latest');
    return toNumber(block.timestamp);
  }
}
