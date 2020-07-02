import test from 'ava';
import { EthereumTestDriver } from '../ethereum/test-driver';
import { renderVirtualChainManagement } from './render-vc';
import { BlockSync } from '../ethereum/block-sync';
import { StateManager } from '../model/manager';
import { exampleConfig } from '../config.example';
import { day } from '../helpers';

test.serial('[integration] getVirtualChainManagement responds according to Ethereum state', async (t) => {
  t.timeout(5 * 60 * 1000);

  const ethereum = new EthereumTestDriver(true);
  const ethereumEndpoint = 'http://localhost:7545';
  const finalityBufferBlocks = 5;

  // setup Ethereum state
  const firstBlock = await ethereum.getCurrentBlockPreDeploy(ethereumEndpoint);
  await ethereum.deployContracts();
  await ethereum.setupInitialCommittee();
  await ethereum.addVchain(60 * day, 'main');
  await ethereum.addVchain(30 * day, 'canary');
  await ethereum.upgradeProtocolVersion(17, 60 * day, 'main');
  await ethereum.increaseTime(40 * day);
  await ethereum.extendVchain('1000000', 90 * day);
  await ethereum.upgradeProtocolVersion(19, 2 * day, 'main');
  await ethereum.upgradeProtocolVersion(20, 2 * day, 'canary');
  await ethereum.increaseTime(10 * day);
  await ethereum.increaseBlocks(finalityBufferBlocks + 1);

  // setup local state
  const config = {
    ...exampleConfig,
    FirstBlock: firstBlock,
    EthereumGenesisContract: ethereum.getContractRegistryAddress(),
    EthereumEndpoint: ethereumEndpoint,
    FinalityBufferBlocks: finalityBufferBlocks,
  };
  const state = new StateManager(config);
  const blockSync = new BlockSync(state, config);
  await blockSync.run();

  t.log('state snapshot:', JSON.stringify(state.getCurrentSnapshot(), null, 2));

  // process
  const res = renderVirtualChainManagement(1000000, state.getCurrentSnapshot(), config);

  t.log('result:', JSON.stringify(res, null, 2));

  t.assert(res.CurrentRefTime > 1400000000);
  t.is(res.PageStartRefTime, 0);
  t.is(res.PageEndRefTime, res.CurrentRefTime);
  t.is(res.VirtualChains['1000000'].VirtualChainId, 1000000);
  t.assert(res.VirtualChains['1000000'].GenesisRefTime > 1400000000);
  t.deepEqual(res.VirtualChains['1000000'].CurrentTopology, [
    {
      EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
      OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      Ip: '41.206.134.10',
      Port: 10000,
    },
    {
      EthAddress: '51baa09f2f7dfc7a0f65886b68720958d389cac7',
      OrbsAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
      Ip: '81.186.160.159',
      Port: 10000,
    },
    {
      EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
      OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
      Ip: '138.103.13.220',
      Port: 10000,
    },
    {
      EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
      OrbsAddress: '33546759bdcfb5c753a4102b86b3e73e714d5213',
      Ip: '203.102.66.190',
      Port: 10000,
    },
    {
      EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
      Ip: '225.110.150.90',
      Port: 10000,
    },
  ]);
  t.is(res.VirtualChains['1000000'].CommitteeEvents.length, 3);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[0].Committee, [
    {
      OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
      Weight: 10000,
      IdentityType: 0,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[1].Committee, [
    {
      OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
      EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      Weight: 20000,
      IdentityType: 0,
    },
    {
      OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
      Weight: 15000,
      IdentityType: 0,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[2].Committee, [
    {
      OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
      EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
      Weight: 40000,
      IdentityType: 0,
    },
    {
      OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
      EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      Weight: 30000,
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
  t.throws(() => {
    renderVirtualChainManagement(1009999, state.getCurrentSnapshot(), config);
  });
});
