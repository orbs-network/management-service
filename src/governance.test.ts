import test from 'ava';
import {
  applyGovernance,
  GOVERNANCE_GANACHE_FIRST_BLOCK,
  GOVERNANCE_GANACHE_GENESIS_CONTRACT,
  GOVERNANCE_MAINNET_FIRST_BLOCK,
  GOVERNANCE_MAINNET_GENESIS_CONTRACT,
} from './governance';
import { exampleConfig } from './config.example';

test('sets governance params', (t) => {
  const config = { ...exampleConfig };
  config.EthereumGenesisContract = '';
  config.EthereumFirstBlock = -999;

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  applyGovernance(config);

  t.deepEqual(config.EthereumFirstBlock, GOVERNANCE_MAINNET_FIRST_BLOCK);
  t.deepEqual(config.EthereumGenesisContract, GOVERNANCE_MAINNET_GENESIS_CONTRACT);

  process.env.NODE_ENV = originalNodeEnv;

  applyGovernance(config);

  t.deepEqual(config.EthereumFirstBlock, GOVERNANCE_GANACHE_FIRST_BLOCK);
  t.deepEqual(config.EthereumGenesisContract, GOVERNANCE_GANACHE_GENESIS_CONTRACT);
});
