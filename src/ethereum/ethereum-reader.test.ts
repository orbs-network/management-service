import test from 'ava';
import { Driver, createVC } from '@orbs-network/orbs-ethereum-contracts-v2';
import { EthereumConfigReader } from './ethereum-reader';

test.serial('EthereumConfigReader reads registry for contracts address', async (t) => {
  t.timeout(60 * 1000);
  const d = await Driver.new();
  const numnberOfVChains = 5;

  for (const _ of new Array(numnberOfVChains)) {
    await createVC(d);
  }

  const reader = new EthereumConfigReader({
    EthereumGenesisContract: d.contractRegistry.web3Contract.options.address,
    EthereumEndpoint: 'http://localhost:7545',
    FirstBlock: 0,
    verbose: true,
  });

  const config = reader.readEthereumConfig();
  t.deepEqual(config.httpEndpoint, 'http://localhost:7545');
  t.deepEqual((await config.contracts).subscriptions?.address, d.subscriptions.web3Contract.options.address);
});
