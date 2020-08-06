import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getVirtualChainPort } from './ports';
import { JsonResponse } from '../helpers';

export function renderNodeManagement(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const response: JsonResponse = {
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
    services: {},
  };

  // include signer if found a viable image for it
  response.services['signer'] = getSigner(snapshot, config);
  if (!response.services['signer']) delete response.services['signer'];

  // include management-service if found a viable image for it
  response.services['management-service'] = getManagementService(snapshot, config);
  if (!response.services['management-service']) delete response.services['management-service'];

  // include ethereum-writer if found a viable image for it and its contract addresses are known
  response.services['ethereum-writer'] = getEthereumWriter(snapshot, config);
  if (!response.services['ethereum-writer']) delete response.services['ethereum-writer'];

  // include rewards-service if found a viable image for it and its contract addresses are known
  response.services['rewards-service'] = getRewardsService(snapshot, config);
  if (!response.services['rewards-service']) delete response.services['rewards-service'];

  // include chains if found a viable image for node
  response.chains = Object.keys(snapshot.CurrentVirtualChains).map((vcId) =>
    getChain(parseInt(vcId), snapshot, config)
  );
  _.remove(response.chains, (vc) => _.isUndefined(vc));

  return response;
}

// helpers

function getSigner(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['signer'];
  if (!version) return undefined;

  return {
    InternalPort: 7777,
    Disabled: false,
    DockerConfig: {
      Image: `${config.DockerNamespace}/signer`,
      Tag: version,
      Pull: true,
    },
    Config: {
      api: 'v1',
    },
  };
}

function getManagementService(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['management-service'];
  if (!version) return undefined;

  return {
    InternalPort: 8080,
    ExternalPort: 7666,
    Disabled: false,
    DockerConfig: {
      Image: `${config.DockerNamespace}/management-service`,
      Tag: version,
      Pull: true,
    },
    Config: { ...config, BootstrapMode: false }, // forward my own input config + defaults for what's missing
  };
}

function getEthereumWriter(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['ethereum-writer'];
  if (!version) return undefined;
  const elections = snapshot.CurrentContractAddress['elections'];
  if (!elections) return undefined;

  return {
    Disabled: false,
    DockerConfig: {
      Image: `${config.DockerNamespace}/ethereum-writer`,
      Tag: version,
      Pull: true,
    },
    AllowAccessToSigner: true,
    AllowAccessToServices: true,
    Config: {
      ManagementServiceEndpoint: 'http://management-service:8080',
      EthereumEndpoint: config.EthereumEndpoint,
      SignerEndpoint: 'http://signer:7777',
      EthereumElectionsContract: elections,
      NodeOrbsAddress: config['node-address'],
    },
  };
}

function getRewardsService(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['rewards-service'];
  if (!version) return undefined;
  const guardian = _.findKey(snapshot.CurrentOrbsAddress, (orbsAddress) => orbsAddress == config['node-address']);
  if (!guardian) return undefined;
  const registration = snapshot.CurrentRegistrationData[guardian];
  if (!registration) return undefined;
  const frequency = Math.round(parseInt(registration.Metadata['REWARDS_FREQUENCY_SEC']));

  return {
    Disabled: false,
    DockerConfig: {
      Image: `${config.DockerNamespace}/rewards-service`,
      Tag: version,
      Pull: true,
    },
    AllowAccessToSigner: true,
    Config: {
      DistributionFrequencySeconds: frequency > 0 ? frequency : undefined,
      EthereumEndpoint: config.EthereumEndpoint,
      SignerEndpoint: 'http://signer:7777',
      EthereumGenesisContract: config.EthereumGenesisContract,
      GuardianAddress: `0x${guardian}`,
      NodeOrbsAddress: config['node-address'],
      EthereumFirstBlock: config.EthereumFirstBlock,
    },
  };
}

function getChain(vchainId: number, snapshot: StateSnapshot, config: ServiceConfiguration) {
  const mainVersion = snapshot.CurrentImageVersions['main']['node'];
  if (!mainVersion) return undefined;
  const rolloutGroup = snapshot.CurrentVirtualChains[vchainId.toString()].RolloutGroup;

  return {
    Id: vchainId,
    InternalPort: 4400,
    ExternalPort: getVirtualChainPort(vchainId),
    InternalHttpPort: 8080,
    Disabled: false,
    DockerConfig: {
      Image: `${config.DockerNamespace}/node`,
      Tag: snapshot.CurrentImageVersions[rolloutGroup]?.['node'] ?? mainVersion,
      Pull: true,
    },
    AllowAccessToSigner: true,
    AllowAccessToServices: true,
    Config: {
      'management-file-path': `http://management-service:8080/vchains/${vchainId}/management`,
      'management-consensus-grace-timeout': '0s', // TODO: temporary to simplify staging, remove eventually
      'signer-endpoint': 'http://signer:7777',
      'ethereum-endpoint': config.EthereumEndpoint,
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
}
