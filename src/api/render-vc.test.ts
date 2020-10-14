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
    EthereumFirstBlock: firstBlock,
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
      EthAddress: '02ebe4663d6110aec8f816f9772a4087cc1a5ec7',
      OrbsAddress: 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
      Ip: '2.235.228.102',
      Port: 10000,
      Name: 'Guardian3',
    },
    {
      EthAddress: '44ea9fbfebb3162a5778b30fb2ba2a66cc5291a8',
      OrbsAddress: '33a8534adfddd5a774fb4b245f25b9a54c931346',
      Ip: '68.234.159.191',
      Port: 10000,
      Name: 'Guardian4',
    },
    {
      EthAddress: '7d5b6545e3427374adeb96f4198c05812f7625b1',
      OrbsAddress: '605b47645c2ff7ffb9756a051048d006d2b1ef4a',
      Ip: '125.91.101.69',
      Port: 10000,
      Name: 'Guardian5',
    },
    {
      EthAddress: '94fda04016784d0348ec2ece7a9b24e3313885f0',
      OrbsAddress: '945dc264e11c09f8a518da6ce1bea493e0055b16',
      Ip: '148.253.160.64',
      Port: 10000,
      Name: 'Guardian2',
    },
    {
      EthAddress: '98b4d71c78789637364a70f696227ec89e35626c',
      OrbsAddress: 'b1985d8a332bfc903fd437489ea933792fbfa500',
      Ip: '152.180.215.28',
      Port: 10000,
      Name: 'Guardian1',
    },
  ]);
  t.is(res.VirtualChains['1000000'].CommitteeEvents.length, 3);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[0].Committee, [
    {
      OrbsAddress: 'b1985d8a332bfc903fd437489ea933792fbfa500',
      EthAddress: '98b4d71c78789637364a70f696227ec89e35626c',
      Weight: 10000,
      IdentityType: 0,
      EffectiveStake: 10000,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[1].Committee, [
    {
      OrbsAddress: '945dc264e11c09f8a518da6ce1bea493e0055b16',
      EthAddress: '94fda04016784d0348ec2ece7a9b24e3313885f0',
      Weight: 20000,
      IdentityType: 0,
      EffectiveStake: 20000,
    },
    {
      OrbsAddress: 'b1985d8a332bfc903fd437489ea933792fbfa500',
      EthAddress: '98b4d71c78789637364a70f696227ec89e35626c',
      Weight: 15000,
      IdentityType: 0,
      EffectiveStake: 10000,
    },
  ]);
  t.deepEqual(res.VirtualChains['1000000'].CommitteeEvents[2].Committee, [
    {
      OrbsAddress: '33a8534adfddd5a774fb4b245f25b9a54c931346',
      EthAddress: '44ea9fbfebb3162a5778b30fb2ba2a66cc5291a8',
      Weight: 40000,
      IdentityType: 0,
      EffectiveStake: 40000,
    },
    {
      OrbsAddress: '945dc264e11c09f8a518da6ce1bea493e0055b16',
      EthAddress: '94fda04016784d0348ec2ece7a9b24e3313885f0',
      Weight: 30000,
      IdentityType: 0,
      EffectiveStake: 20000,
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
