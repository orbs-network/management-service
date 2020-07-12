import _ from 'lodash';
import test from 'ava';
import { Driver, createVC } from '@orbs-network/orbs-ethereum-contracts-v2';
import { EthereumConfigReader, EthereumReader } from './ethereum-reader';

test.serial('EthereumConfigReader reads registry for contracts address', async (t) => {
  t.timeout(60 * 1000);
  const d = await Driver.new();
  const numberOfVChains = 5;

  for (const _ of new Array(numberOfVChains)) {
    await createVC(d);
  }

  const configReader = new EthereumConfigReader({
    EthereumGenesisContract: d.contractRegistry.address,
    EthereumEndpoint: 'http://localhost:7545',
    EthereumFirstBlock: 0,
    Verbose: true,
  });

  const ethConfig = configReader.readEthereumConfig();
  t.deepEqual(ethConfig.httpEndpoint, 'http://localhost:7545');
  t.deepEqual((await ethConfig.contracts).subscriptions?.address, d.subscriptions.address);

  const ethereumReader = new EthereumReader(ethConfig);
  const contractAddresses = await ethereumReader.getContractAddresses();
  t.assert(
    _.isMatch(contractAddresses, {
      protocol: d.protocol.address,
      committee: d.committee.address,
      elections: d.elections.address,
      delegations: d.delegations.address,
      validatorsRegistration: d.validatorsRegistration.address,
      compliance: d.compliance.address,
      staking: d.staking.address,
      subscriptions: d.subscriptions.address,
      rewards: d.rewards.address,
    })
  );
});
