import test from 'ava';
import { EthereumTestDriver } from '../ethereum/test-driver';
import { getNodeManagement } from './processor-node';
import { BlockSync } from '../ethereum/block-sync';
import { StateManager } from '../model/manager';
import { nockDockerHub } from '../dockerhub/test-driver';
import { ImagePoll } from '../dockerhub/image-poll';
import { exampleConfig } from '../config.example';
import { day } from '../helpers';

test.serial('[integration] getNodeManagement responds according to Ethereum and DockerHub state', async (t) => {
  t.timeout(5 * 60 * 1000);

  const ethereum = new EthereumTestDriver(true);
  const FinalityBufferBlocks = 5;

  // mock docker hub state
  const scope = nockDockerHub(
    { user: 'mydockernamespace', name: 'node', tags: ['v0.0.1', 'v1.2.3', 'v1.0.0'] },
    { user: 'mydockernamespace', name: 'management-service', tags: ['v0.9.9', 'v4.5.6', 'v3.9.9'] }
  );

  // setup Ethereum state
  await ethereum.deployContracts();
  await ethereum.addVchain(30 * day);
  await ethereum.addVchain(30 * day);
  await ethereum.increaseTime(40 * day);
  await ethereum.extendVchain('1000000', 90 * day);
  await ethereum.increaseBlocks(FinalityBufferBlocks + 1);

  // setup local state
  const config = {
    ...exampleConfig,
    EthereumGenesisContract: ethereum.getContractRegistryAddress(),
    EthereumEndpoint: 'http://localhost:7545',
    DockerNamespace: 'mydockernamespace',
    FinalityBufferBlocks: FinalityBufferBlocks,
  };
  const state = new StateManager();
  const blockSync = new BlockSync(state, config);
  await blockSync.run();
  const imagePoll = new ImagePoll(state, config);
  await imagePoll.run();

  console.log('state snapshot:', JSON.stringify(state.getCurrentSnapshot(), null, 2));

  // process
  const res = getNodeManagement(state.getCurrentSnapshot(), config);

  console.log('result:', JSON.stringify(res, null, 2));

  t.is(res.chains.length, 2);
  t.is(res.chains[0].Id, 1000000);
  t.is(res.chains[0].ExternalPort, 32768);
  t.is(res.chains[0].Config['management-file-path'], 'http://management-service:8080/vchains/1000000/management');
  t.is(res.chains[1].Id, 1000001);
  t.is(res.chains[1].ExternalPort, 32769);
  t.is(res.chains[1].Config['management-file-path'], 'http://management-service:8080/vchains/1000001/management');
  for (const chain of res.chains) {
    t.deepEqual(chain.DockerConfig, {
      Image: 'mydockernamespace/node',
      Tag: 'v1.2.3',
      Pull: true,
    });
    t.is(chain.Config['ethereum-endpoint'], config.EthereumEndpoint);
  }
  t.deepEqual(res.services['management-service'].DockerConfig, {
    Image: 'mydockernamespace/management-service',
    Tag: 'v4.5.6',
    Pull: true,
  });
  t.deepEqual(res.services['management-service'].Config, config);
  t.assert(res.services['signer']);
  t.assert(res.orchestrator);

  scope.done();
});
