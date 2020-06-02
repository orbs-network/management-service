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
            EthAddress: '0x174dC3B45BdBbc32Aa0b95e64d0247cE99B08F69',
            OrbsAddress: '0x8A670Ddc1910c27278Ab7Db2a148A0dCCC6bf0f5',
            Ip: '23.77.195.180',
            Port: 32768,
          },
          {
            EthAddress: '0x16fcF728F8dc3F687132f2157D8379c021a08C12',
            OrbsAddress: '0xe16e965a4cC3FcD597ECDb9Cd9ab8f3e6A750Ac9',
            Ip: '22.252.247.40',
            Port: 32768,
          },
          {
            EthAddress: '0x7C2300d32ebF4a6aE9edf95F4f57Ab5A07488c2E',
            OrbsAddress: '0xcb6642be414696F77336DAE06feD3775F08dE0Ea',
            Ip: '124.35.0.211',
            Port: 32768,
          },
        ],
        CommitteeEvents: [
          {
            RefTime: isValidTimeRef,
            Committee: [
              {
                OrbsAddress: '0x29cE860A2247D97160d6DFC087a15F41E2349087',
                EthAddress: '0x3fced656aCBd6700cE7d546f6EFDCDd482D8142a',
                EffectiveStake: 10000,
                IdentityType: 0,
              },
            ],
          },
          {
            RefTime: isValidTimeRef,
            Committee: [
              {
                OrbsAddress: '0xe16e965a4cC3FcD597ECDb9Cd9ab8f3e6A750Ac9',
                EthAddress: '0x16fcF728F8dc3F687132f2157D8379c021a08C12',
                EffectiveStake: 20000,
                IdentityType: 0,
              },
              {
                OrbsAddress: '0x29cE860A2247D97160d6DFC087a15F41E2349087',
                EthAddress: '0x3fced656aCBd6700cE7d546f6EFDCDd482D8142a',
                EffectiveStake: 10000,
                IdentityType: 0,
              },
            ],
          },
          {
            RefTime: isValidTimeRef,
            Committee: [
              {
                OrbsAddress: '0x8A670Ddc1910c27278Ab7Db2a148A0dCCC6bf0f5',
                EthAddress: '0x174dC3B45BdBbc32Aa0b95e64d0247cE99B08F69',
                EffectiveStake: 40000,
                IdentityType: 0,
              },
              {
                OrbsAddress: '0xe16e965a4cC3FcD597ECDb9Cd9ab8f3e6A750Ac9',
                EthAddress: '0x16fcF728F8dc3F687132f2157D8379c021a08C12',
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
