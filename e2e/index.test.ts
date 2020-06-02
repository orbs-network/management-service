import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { day, sleep } from '../src/helpers';
import { deepDataMatcher, isValidEthereumAddress, isValidImageVersion, isValidTimeRef } from './deep-matcher';
import { getVirtualChainPort } from '../src/api/helpers';

let stateReadyBlockTime = 0;
const driver = new TestEnvironment(join(__dirname, 'docker-compose.yml'));
driver.launchServices();

test.serial.before(async (t) => {
  t.log('[E2E] set up ethereum state');
  t.timeout(60 * 1000);
  await driver.ethereum.setupInitialCommittee();
  await driver.ethereum.addVchain(30 * day);
  await driver.ethereum.addVchain(30 * day);
  await driver.ethereum.upgradeProtocolVersion(17, 60 * day);
  await driver.ethereum.increaseTime(40 * day);
  await driver.ethereum.extendVchain('1000000', 90 * day);
  await driver.ethereum.upgradeProtocolVersion(19, 2 * day);
  await driver.ethereum.addVchain(90 * day);
  await driver.ethereum.increaseTime(10 * day);
  await driver.ethereum.increaseBlocks(1);
  stateReadyBlockTime = await driver.ethereum.getCurrentBlockTime();
  await driver.ethereum.increaseBlocks(driver.getAppConfig().FinalityBufferBlocks);
  t.log('[E2E] set up ethereum state done, block time:', stateReadyBlockTime);
});

test.serial('[E2E] serves /node/management as expected', async (t) => {
  t.log('started');

  driver.testLogger = t.log;
  t.timeout(60 * 1000);

  t.log('fetching node/management');
  let res = await driver.fetch('app', 8080, 'node/management');
  while (!res || isErrorResponse(res) || res.chains.length < 3) {
    await sleep(1000);
    t.log('fetching node/management again, since last response:', res);
    res = await driver.fetch('app', 8080, 'node/management');
  }

  t.log('[E2E] result:', JSON.stringify(res, null, 2));

  const errors = deepDataMatcher(res, {
    network: [],
    orchestrator: {
      DynamicManagementConfig: {
        Url: 'http://localhost:7666/node/management',
        ReadInterval: '30s',
        ResetTimeout: '30m',
      },
      'storage-driver': 'local',
      'storage-mount-type': 'bind',
    },
    services: {
      signer: {
        InternalPort: 7777,
        DockerConfig: {
          Image: 'orbsnetwork/signer',
          Tag: 'experimental',
          Pull: true,
        },
        Config: {
          api: 'v1',
        },
      },
      'management-service': {
        InternalPort: 8080,
        ExternalPort: 7666,
        DockerConfig: {
          Image: 'orbsnetwork/management-service',
          Tag: isValidImageVersion,
          Pull: true,
        },
        Config: {
          Port: 8080,
          DockerNamespace: 'orbsnetwork',
          DockerHubPollIntervalSeconds: 1,
          EthereumPollIntervalSeconds: 1,
          FirstBlock: 0,
          FinalityBufferBlocks: 10,
          verbose: true,
          EthereumGenesisContract: isValidEthereumAddress,
          EthereumEndpoint: 'http://ganache:7545',
        },
      },
    },
    chains: [1000000, 1000001, 1000002].map((vcId) => {
      return {
        Id: vcId,
        InternalPort: 4400,
        ExternalPort: getVirtualChainPort(vcId),
        InternalHttpPort: 8080,
        Disabled: false,
        DockerConfig: {
          Image: 'orbsnetwork/node',
          Tag: isValidImageVersion,
          Pull: true,
        },
        Config: {
          'management-file-path': `http://management-service:8080/vchains/${vcId}/management`,
          'signer-endpoint': 'http://signer:7777',
          'ethereum-endpoint': 'http://ganache:7545',
          'active-consensus-algo': 2,
          'lean-helix-show-debug': true,
          'consensus-context-triggers-enabled': true,
          'transaction-pool-time-between-empty-blocks': '9s',
          'lean-helix-consensus-round-timeout-interval': '14s',
          'block-sync-no-commit-interval': '18s',
          'consensus-context-system-timestamp-allowed-jitter': '1m',
          'logger-file-truncation-interval': '4h',
          profiling: true,
        },
      };
    }),
  });
  t.deepEqual(errors, []);
});

test.serial('[E2E] serves /vchains/1000000/management as expected', async (t) => {
  t.log('started');

  driver.testLogger = t.log;
  t.timeout(60 * 1000);

  t.log('fetching vchains/1000000/management');
  let res = await driver.fetch('app', 8080, 'vchains/1000000/management');
  while (!res || isErrorResponse(res) || res.CurrentRefTime < stateReadyBlockTime) {
    await sleep(1000);
    console.log('fetching node/management again, since last response:', res);
    t.log('fetching vchains/1000000/management again, since last response:', res);
    res = await driver.fetch('app', 8080, 'vchains/1000000/management');
  }

  t.log('[E2E] result:', JSON.stringify(res, null, 2));

  const errors = deepDataMatcher(res, {
    CurrentRefTime: isValidTimeRef,
    PageStartRefTime: 0,
    PageEndRefTime: isValidTimeRef,
    VirtualChains: {
      '1000000': {
        VirtualChainId: 1000000,
        CurrentTopology: [
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
        ],
        CommitteeEvents: [
          {
            RefTime: isValidTimeRef,
            Committee: [
              {
                OrbsAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
                EthAddress: '3fced656acbd6700ce7d546f6efdcdd482d8142a',
                EffectiveStake: 10000,
                IdentityType: 0,
              },
            ],
          },
          {
            RefTime: isValidTimeRef,
            Committee: [
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
            ],
          },
          {
            RefTime: isValidTimeRef,
            Committee: [
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
            ],
          },
        ],
        SubscriptionEvents: [
          {
            RefTime: isValidTimeRef,
            Data: {
              Status: 'active',
              Tier: 'defaultTier',
              RolloutGroup: 'main',
              IdentityType: 0,
            },
          },
          {
            RefTime: isValidTimeRef,
            Data: {
              Status: 'expired',
              Tier: 'defaultTier',
              RolloutGroup: 'main',
              IdentityType: 0,
            },
          },
          {
            RefTime: isValidTimeRef,
            Data: {
              Status: 'active',
              Tier: 'defaultTier',
              RolloutGroup: 'main',
              IdentityType: 0,
            },
          },
          {
            RefTime: isValidTimeRef,
            Data: {
              Status: 'expired',
              Tier: 'defaultTier',
              RolloutGroup: 'main',
              IdentityType: 0,
            },
          },
        ],
        ProtocolVersionEvents: [
          {
            RefTime: isValidTimeRef,
            Data: {
              Version: 1,
              RolloutGroup: 'main',
            },
          },
          {
            RefTime: isValidTimeRef,
            Data: {
              Version: 19,
              RolloutGroup: 'main',
            },
          },
        ],
      },
    },
  });
  t.deepEqual(errors, []);
});

function isErrorResponse(res: any): res is { error: string; stack?: string | undefined; status: 'error' } {
  return res && res.status === 'error';
}
