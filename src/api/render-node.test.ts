import test from 'ava';
import { EthereumTestDriver } from '../ethereum/test-driver';
import { renderNodeManagement } from './render-node';
import { BlockSync } from '../ethereum/block-sync';
import { StateManager } from '../model/manager';
import { nockDockerHub } from '../dockerhub/test-driver';
import { ImagePoll } from '../dockerhub/image-poll';
import { exampleConfig } from '../config.example';
import { day, sleep } from '../helpers';

test.serial('[integration] getNodeManagement responds according to Ethereum and DockerHub state', async (t) => {
  t.timeout(5 * 60 * 1000);

  const ethereum = new EthereumTestDriver(true);
  const ethereumEndpoint = 'http://localhost:7545';
  const finalityBufferBlocks = 5;

  // mock docker hub state
  const scope = nockDockerHub(
    { user: 'mydockernamespace', name: 'node', tags: ['v0.0.1', 'v1.2.3', 'v1.2.4-canary', 'v1.0.0'] },
    { user: 'mydockernamespace', name: 'management-service', tags: ['v0.9.9', 'v4.5.6', 'v4.5.7-canary', 'v3.9.9'] },
    { user: 'mydockernamespace', name: 'signer', tags: ['v1.1.0'] },
    { user: 'mydockernamespace', name: 'ethereum-writer', tags: ['v1.1.0'] },
    { user: 'mydockernamespace', name: 'logs-service', tags: ['v1.1.0'] }
  );

  // setup Ethereum state
  const firstBlock = await ethereum.getCurrentBlockPreDeploy(ethereumEndpoint);
  await ethereum.deployContracts();
  await ethereum.setupInitialCommittee();
  await ethereum.addVchain(30 * day, 'main');
  await ethereum.addVchain(30 * day, 'canary');
  await ethereum.increaseTime(40 * day);
  await ethereum.extendVchain('1000000', 90 * day);
  await ethereum.increaseBlocks(finalityBufferBlocks + 1);

  // setup local state
  const config = {
    ...exampleConfig,
    EthereumGenesisContract: ethereum.getContractRegistryAddress(),
    EthereumEndpoint: ethereumEndpoint,
    DockerNamespace: 'mydockernamespace',
    ElectionsAuditOnly: true,
    FinalityBufferBlocks: finalityBufferBlocks,
    EthereumFirstBlock: firstBlock,
    RegularRolloutWindowSeconds: 1000000,
    HotfixRolloutWindowSeconds: 2,
    ExternalLaunchConfig: {
      BootstrapMode: true,
      SomeExternalField: 'someExternalFieldValue',
    },
  };
  const state = new StateManager(config);
  const blockSync = new BlockSync(state, config);
  await blockSync.run();
  const imagePoll = new ImagePoll(state, config);
  await imagePoll.run();

  t.log('state snapshot:', JSON.stringify(state.getCurrentSnapshot(), null, 2));

  // process
  const res = JSON.parse(JSON.stringify(renderNodeManagement(state.getCurrentSnapshot(), config)));

  t.log('result:', JSON.stringify(res, null, 2));

  t.is(res.chains.length, 2);
  t.is(res.chains[0].Id, 1000000);
  t.is(res.chains[0].ExternalPort, 10000);
  t.is(res.chains[0].Config['management-file-path'], 'http://management-service:8080/vchains/1000000/management');
  t.deepEqual(res.chains[0].DockerConfig, {
    Image: 'mydockernamespace/node',
    Tag: 'v1.2.3',
    Pull: true,
  });
  t.is(res.chains[1].Id, 1000001);
  t.is(res.chains[1].ExternalPort, 10001);
  t.is(res.chains[1].Config['management-file-path'], 'http://management-service:8080/vchains/1000001/management');
  t.deepEqual(res.chains[1].DockerConfig, {
    Image: 'mydockernamespace/node',
    Tag: 'v1.2.4-canary',
    Pull: true,
  });
  t.deepEqual(res.services['signer'].DockerConfig, {
    Image: 'mydockernamespace/signer',
    Tag: 'v1.1.0',
    Pull: true,
  });
  t.deepEqual(res.services['management-service'].DockerConfig, {
    Image: 'mydockernamespace/management-service',
    Tag: 'v4.5.6',
    Pull: true,
  });
  t.deepEqual(res.services['ethereum-writer'].DockerConfig, {
    Image: 'mydockernamespace/ethereum-writer',
    Tag: 'v1.1.0',
    Pull: true,
  });
  t.deepEqual(res.services['logs-service'].DockerConfig, {
    Image: 'mydockernamespace/logs-service',
    Tag: 'v1.1.0',
    Pull: true,
  });
  t.deepEqual(res.services['management-service'].Config, {
    BootstrapMode: false,
    SomeExternalField: 'someExternalFieldValue',
  });
  t.deepEqual(res.services['ethereum-writer'].Config, {
    ManagementServiceEndpoint: 'http://management-service:8080',
    EthereumEndpoint: config.EthereumEndpoint,
    SignerEndpoint: 'http://signer:7777',
    EthereumElectionsContract: ethereum.getContractAddress('elections'),
    NodeOrbsAddress: 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
    ElectionsAuditOnly: true,
  });
  t.deepEqual(res.services['logs-service'].Config, {
    Port: 8080,
    SkipBatchesOnMismatch: 3,
    LogsPath: '/opt/orbs/logs',
    StatusJsonPath: './status/status.json',
    StatusUpdateLoopIntervalSeconds: 20,
  });
  t.assert(res.orchestrator);

  scope.done();

  // mock docker hub state with a few new versions
  const scope2 = nockDockerHub(
    { user: 'mydockernamespace', name: 'node', tags: ['v1.2.3', 'v1.2.4-canary', 'v1.2.5', 'v1.2.6-canary-hotfix'] },
    {
      user: 'mydockernamespace',
      name: 'management-service',
      tags: ['v0.9.9', 'v4.5.6', 'v4.5.7-canary', 'v4.5.8-immediate'],
    },
    { user: 'mydockernamespace', name: 'signer', tags: ['v1.1.0'] },
    { user: 'mydockernamespace', name: 'ethereum-writer', tags: ['v1.1.0'] },
    { user: 'mydockernamespace', name: 'logs-service', tags: ['v1.1.0'] }
  );

  // run poller and process again
  await imagePoll.run();
  await sleep(3000); // enough time for hotfix to take place
  const res2 = renderNodeManagement(state.getCurrentSnapshot(), config);

  t.log('result2:', JSON.stringify(res2, null, 2));

  t.deepEqual(res2.chains[0].DockerConfig, {
    Image: 'mydockernamespace/node',
    Tag: 'v1.2.3', // slow gradual rollout so no change yet
    Pull: true,
  });
  t.deepEqual(res2.chains[1].DockerConfig, {
    Image: 'mydockernamespace/node',
    Tag: 'v1.2.6-canary-hotfix', // gradual rollout with fast change
    Pull: true,
  });
  t.deepEqual(res2.services['signer'].DockerConfig, {
    Image: 'mydockernamespace/signer',
    Tag: 'v1.1.0', // no upgrade
    Pull: true,
  });
  t.deepEqual(res2.services['management-service'].DockerConfig, {
    Image: 'mydockernamespace/management-service',
    Tag: 'v4.5.8-immediate', // gradual rollout with immediate
    Pull: true,
  });
  t.deepEqual(res.services['ethereum-writer'].DockerConfig, {
    Image: 'mydockernamespace/ethereum-writer',
    Tag: 'v1.1.0', // no upgrade
    Pull: true,
  });
  t.deepEqual(res.services['logs-service'].DockerConfig, {
    Image: 'mydockernamespace/logs-service',
    Tag: 'v1.1.0', // no upgrade
    Pull: true,
  });

  scope2.done();
});
