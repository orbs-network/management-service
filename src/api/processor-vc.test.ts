import test from 'ava';
import { EthereumTestDriver } from '../ethereum/test-driver';
import { getVirtualChainManagement } from './processor-vc';
import { BlockSync } from '../ethereum/block-sync';
import { StateManager } from '../model/manager';
import { day } from '../helpers';

test.serial('[integration] getVirtualChainManagement responds according to Ethereum state', async (t) => {
  t.timeout(5 * 60 * 1000);

  const ethereum = new EthereumTestDriver(true);
  const FinalityBufferBlocks = 5;

  // setup Ethereum state
  await ethereum.deployContracts();
  await ethereum.setupInitialCommittee();
  await ethereum.addVchain(60 * day);
  await ethereum.addVchain(30 * day);
  await ethereum.upgradeProtocolVersion(17, 60 * day);
  await ethereum.increaseTime(40 * day);
  await ethereum.extendVchain('1000000', 90 * day);
  await ethereum.upgradeProtocolVersion(19, 2 * day);
  await ethereum.increaseTime(10 * day);
  await ethereum.increaseBlocks(FinalityBufferBlocks + 1);

  // setup local state
  const config = {
    FirstBlock: 0,
    EthereumGenesisContract: ethereum.getContractRegistryAddress(),
    EthereumEndpoint: 'http://localhost:7545',
    FinalityBufferBlocks: FinalityBufferBlocks,
    verbose: false,
  };
  const state = new StateManager();
  const blockSync = new BlockSync(state, config);
  await blockSync.run();

  console.log('state snapshot:', JSON.stringify(state.getCurrentSnapshot(), null, 2));

  // process
  const res = getVirtualChainManagement(1000000, state.getCurrentSnapshot());

  console.log('result:', JSON.stringify(res, null, 2));

  t.assert(res.CurrentRefTime > 1400000000);
  t.is(res.PageStartRefTime, 0);
  t.is(res.PageEndRefTime, res.CurrentRefTime);
  t.is(res.VirtualChains['1000000'].VirtualChainId, 1000000);
  t.deepEqual(res.VirtualChains['1000000'].CurrentTopology, [
    {
      EthAddress: '0x174dC3B45BdBbc32Aa0b95e64d0247cE99B08F69',
      OrbsAddress: '0x8A670Ddc1910c27278Ab7Db2a148A0dCCC6bf0f5',
      Ip: '23.77.195.180',
      Port: 32768,
    },
    {
      EthAddress: '0x16fcF728F8dc3F687132f2157D8379c021a08C12',
      OrbsAddress: '0xe16e965a4cC3FcD597ECDb9Cd9ab8f3e6A750Ac9',
      Ip: '22.252.247.40',
      Port: 32768,
    },
    {
      EthAddress: '0x7C2300d32ebF4a6aE9edf95F4f57Ab5A07488c2E',
      OrbsAddress: '0xcb6642be414696F77336DAE06feD3775F08dE0Ea',
      Ip: '124.35.0.211',
      Port: 32768,
    },
  ]);
  t.is(res.VirtualChains['1000000'].CommitteeEvents.length, 3);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[0].Committee, [
    {
      OrbsAddress: '0x29cE860A2247D97160d6DFC087a15F41E2349087',
      EthAddress: '0x3fced656aCBd6700cE7d546f6EFDCDd482D8142a',
      EffectiveStake: 10000,
      IdentityType: 0,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[1].Committee, [
    {
      OrbsAddress: '0xe16e965a4cC3FcD597ECDb9Cd9ab8f3e6A750Ac9',
      EthAddress: '0x16fcF728F8dc3F687132f2157D8379c021a08C12',
      EffectiveStake: 20000,
      IdentityType: 0,
    },
    {
      OrbsAddress: '0x29cE860A2247D97160d6DFC087a15F41E2349087',
      EthAddress: '0x3fced656aCBd6700cE7d546f6EFDCDd482D8142a',
      EffectiveStake: 10000,
      IdentityType: 0,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[2].Committee, [
    {
      OrbsAddress: '0x8A670Ddc1910c27278Ab7Db2a148A0dCCC6bf0f5',
      EthAddress: '0x174dC3B45BdBbc32Aa0b95e64d0247cE99B08F69',
      EffectiveStake: 40000,
      IdentityType: 0,
    },
    {
      OrbsAddress: '0xe16e965a4cC3FcD597ECDb9Cd9ab8f3e6A750Ac9',
      EthAddress: '0x16fcF728F8dc3F687132f2157D8379c021a08C12',
      EffectiveStake: 20000,
      IdentityType: 0,
    },
  ]);
  t.is(res.VirtualChains['1000000'].SubscriptionEvents.length, 3);
  t.is(res.VirtualChains['1000000'].SubscriptionEvents[0].Data.Status, 'active');
  t.is(res.VirtualChains['1000000'].SubscriptionEvents[1].Data.Status, 'active');
  t.is(res.VirtualChains['1000000'].SubscriptionEvents[2].Data.Status, 'expired');
  t.assert(res.VirtualChains['1000000'].SubscriptionEvents[2].RefTime > res.CurrentRefTime);
  t.is(res.VirtualChains['1000000'].ProtocolVersionEvents.length, 2);
  t.is(res.VirtualChains['1000000'].ProtocolVersionEvents[0].Data.Version, 1);
  t.is(res.VirtualChains['1000000'].ProtocolVersionEvents[1].Data.Version, 19);

  // process non-existent virtual chain
  const resNonExistent = getVirtualChainManagement(1009999, state.getCurrentSnapshot());
  t.deepEqual(resNonExistent.VirtualChains['1009999'].SubscriptionEvents, []);
});
