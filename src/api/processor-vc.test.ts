import test from 'ava';
import { EthereumTestDriver } from '../ethereum/test-driver';
import { getVirtualChainManagement } from './processor-vc';
import { BlockSync } from '../ethereum/block-sync';
import { StateManager } from '../model/manager';
import { exampleConfig } from '../config.example';
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
  await ethereum.increaseBlocks(300); // for virtual chain genesis, TODO: remove after temp genesis block hack (!)
  await ethereum.increaseBlocks(FinalityBufferBlocks + 1);

  // setup local state
  const config = {
    ...exampleConfig,
    FirstBlock: 0,
    EthereumGenesisContract: ethereum.getContractRegistryAddress(),
    EthereumEndpoint: 'http://localhost:7545',
    FinalityBufferBlocks: FinalityBufferBlocks,
  };
  const state = new StateManager();
  const blockSync = new BlockSync(state, config);
  await blockSync.run();

  t.log('state snapshot:', JSON.stringify(state.getCurrentSnapshot(), null, 2));

  // process
  const res = await getVirtualChainManagement(1000000, state.getCurrentSnapshot(), config);

  t.log('result:', JSON.stringify(res, null, 2));

  t.assert(res.CurrentRefTime > 1400000000);
  t.is(res.PageStartRefTime, 0);
  t.is(res.PageEndRefTime, res.CurrentRefTime);
  t.is(res.VirtualChains['1000000'].VirtualChainId, 1000000);
  t.assert(res.VirtualChains['1000000'].GenesisRefTime > 1400000000);
  t.deepEqual(res.VirtualChains['1000000'].CurrentTopology, [
    {
      EthAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
      OrbsAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
      Ip: '23.77.195.180',
      Port: 10000,
    },
    {
      EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      Ip: '22.252.247.40',
      Port: 10000,
    },
    {
      EthAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
      OrbsAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
      Ip: '124.35.0.211',
      Port: 10000,
    },
  ]);
  t.is(res.VirtualChains['1000000'].CommitteeEvents.length, 3);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[0].Committee, [
    {
      OrbsAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
      EthAddress: '3fced656acbd6700ce7d546f6efdcdd482d8142a',
      EffectiveStake: 10000,
      IdentityType: 0,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[1].Committee, [
    {
      OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      EffectiveStake: 20000,
      IdentityType: 0,
    },
    {
      OrbsAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
      EthAddress: '3fced656acbd6700ce7d546f6efdcdd482d8142a',
      EffectiveStake: 10000,
      IdentityType: 0,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[2].Committee, [
    {
      OrbsAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
      EthAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
      EffectiveStake: 40000,
      IdentityType: 0,
    },
    {
      OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
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
  await t.throwsAsync(async () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await getVirtualChainManagement(1009999, state.getCurrentSnapshot(), config);
  });
});
