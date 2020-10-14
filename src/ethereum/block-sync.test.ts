import _ from 'lodash';
import test from 'ava';
import { EthereumTestDriver } from './test-driver';
import { exampleConfig } from '../config.example';
import { StateManager } from '../model/manager';
import { BlockSync } from './block-sync';

test.serial('[integration] BlockSync reads registry for contract addresses', async (t) => {
  t.timeout(5 * 60 * 1000);

  const ethereum = new EthereumTestDriver(true);
  const ethereumEndpoint = 'http://localhost:7545';
  const finalityBufferBlocks = 5;

  // setup Ethereum state
  const firstBlock = await ethereum.getCurrentBlockPreDeploy(ethereumEndpoint);
  await ethereum.deployContracts();
  await ethereum.setupInitialCommittee();
  await ethereum.increaseBlocks(finalityBufferBlocks + 1);

  // setup local state
  const config = {
    ...exampleConfig,
    BootstrapMode: false,
    EthereumGenesisContract: ethereum.getContractRegistryAddress(),
    EthereumEndpoint: ethereumEndpoint,
    FinalityBufferBlocks: finalityBufferBlocks,
    EthereumFirstBlock: firstBlock,
  };
  const state = new StateManager(config);
  const blockSync = new BlockSync(state, config);
  await blockSync.run();

  t.log('state snapshot:', JSON.stringify(state.getCurrentSnapshot(), null, 2));

  t.assert(
    _.isMatch(state.getCurrentSnapshot().CurrentContractAddress, {
      contractRegistry: config.EthereumGenesisContract,
      protocol: ethereum.getContractAddress('protocol'),
      committee: ethereum.getContractAddress('committee'),
      elections: ethereum.getContractAddress('elections'),
      delegations: ethereum.getContractAddress('delegations'),
      guardiansRegistration: ethereum.getContractAddress('guardiansRegistration'),
      certification: ethereum.getContractAddress('certification'),
      staking: ethereum.getContractAddress('staking'),
      subscriptions: ethereum.getContractAddress('subscriptions'),
    })
  );
});
