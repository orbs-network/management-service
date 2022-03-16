import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getVirtualChainPort } from './ports';
import { JsonResponse, normalizeAddress } from '../helpers';
import * as Logger from '../logger';
import { parseImageTag } from '../deployment/versioning';

export function renderNodeManagement(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const response: JsonResponse = {
    network: [],
    orchestrator: {
      DynamicManagementConfig: {
        Url: 'http://localhost:7666/node/management',
        ReadInterval: '30s',
        ResetTimeout: '30m',
      },
      ExecutableImage: {
        Url: 'https://github.com/orbs-network/boyarin/releases/download/v1.11.2/boyar-v1.11.2.bin',
        Sha256: 'fe6f0d4107741be0adab843e2deca6ed7f28e67fe6dc8d856e45d50a8caf2065',
      },
      'storage-driver': 'local',
      'storage-mount-type': 'bind',
    },
    services: {},
  };

  // we don't want bootstrap images to cause Boyar upgrades/downgrades
  if (config.BootstrapMode) delete response.orchestrator.ExecutableImage;

  // include signer if found a viable image for it
  try {
    response.services['signer'] = getSigner(snapshot);
    if (!response.services['signer']) delete response.services['signer'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include management-service if found a viable image for it
  try {
    response.services['management-service'] = getManagementService(snapshot, config);
    if (!response.services['management-service']) delete response.services['management-service'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include matic-committee-reader if found a viable image for it
  try {
    response.services['matic-reader'] = getMaticReader(snapshot, config);
    if (!response.services['matic-reader']) delete response.services['matic-reader'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include ethereum-writer if found a viable image for it and its contract addresses are known
  try {
    response.services['ethereum-writer'] = getEthereumWriter(snapshot, config);
    if (!response.services['ethereum-writer']) delete response.services['ethereum-writer'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include matic-writer if found a viable image for it and its contract addresses are known
  try {
    response.services['matic-writer'] = getMaticWriter(snapshot, config);
    if (!response.services['matic-writer']) delete response.services['matic-writer'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include logs-service if found a viable image for it
  try {
    response.services['logs-service'] = getLogsService(snapshot);
    if (!response.services['logs-service']) delete response.services['logs-service'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include chains if found a viable image for node
  try {
    response.chains = Object.keys(snapshot.CurrentVirtualChains).map((vcId) => getChain(parseInt(vcId), snapshot));
    _.remove(response.chains, (vc) => _.isUndefined(vc));
  } catch (err) {
    Logger.error(err.toString());
  }

  return response;
}

// helpers

function getSigner(snapshot: StateSnapshot) {
  const version = snapshot.CurrentImageVersions['main']['signer'];
  if (!version) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    InternalPort: 7777,
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
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
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    InternalPort: 8080,
    ExternalPort: 7666,
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    Config: {
      ...config.ExternalLaunchConfig, // to avoid the defaults from config (bugfix)
      BootstrapMode: false,
    },
  };
}

function getMaticReader(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['matic-reader']; // NOTE, management service image serves two purposes
  if (!version) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    InternalPort: 8080,
    ExternalPort: 7667,
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    Config: {
      Port: 8080,
      EthereumGenesisContract: '0x35eA0D75b2a3aB06393749B4651DfAD1Ffd49A77',
      EthereumEndpoint: config.MaticEndpoint ?? 'https://matic-router.global.ssl.fastly.net',
      EthereumFirstBlock: 21700000,
      'node-address': config['node-address'],

      BootstrapMode: false,
    },
  };
}

function getEthereumWriter(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['ethereum-writer'];
  if (!version) return undefined;
  const elections = snapshot.CurrentContractAddress['elections'];
  if (!elections) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    AllowAccessToSigner: true,
    AllowAccessToServices: true,
    Config: {
      ManagementServiceEndpoint: 'http://management-service:8080',
      EthereumEndpoint: config.EthereumEndpoint,
      SignerEndpoint: 'http://signer:7777',
      EthereumElectionsContract: elections,
      NodeOrbsAddress: normalizeAddress(config['node-address']),
      ElectionsAuditOnly: config.ElectionsAuditOnly,
    },
  };
}

function getMaticWriter(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['matic-writer'];
  if (!version) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    AllowAccessToSigner: true,
    AllowAccessToServices: true,
    Config: {
      ManagementServiceEndpoint: 'http://matic-reader:8080',
      EthereumEndpoint: 'https://matic-router.global.ssl.fastly.net',
      SignerEndpoint: 'http://signer:7777',
      EthereumElectionsContract: '0x94f2da1ef22649c642500e8B1C3252A4670eE95b',
      EthereumDiscountGasPriceFactor: 1,
      NodeOrbsAddress: normalizeAddress(config['node-address']),
      ElectionsAuditOnly: false,
      // SuspendVoteUnready: false,
    },
  };
}

function getLogsService(snapshot: StateSnapshot) {
  const version = snapshot.CurrentImageVersions['main']['logs-service'];
  if (!version) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    InternalPort: 8080,
    ExternalPort: 8666,
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    MountNodeLogs: true,
    Config: {
      Port: 8080,
      SkipBatchesOnMismatch: 3,
      LogsPath: '/opt/orbs/logs',
      StatusJsonPath: './status/status.json',
      StatusUpdateLoopIntervalSeconds: 20,
    },
  };
}

function getChain(vchainId: number, snapshot: StateSnapshot) {
  const mainVersion = snapshot.CurrentImageVersions['main']['node'];
  if (!mainVersion) return undefined;
  const rolloutGroup = snapshot.CurrentVirtualChains[vchainId.toString()].RolloutGroup;

  const version = snapshot.CurrentImageVersions[rolloutGroup]?.['node'] ?? mainVersion;
  if (!version) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  return {
    Id: vchainId,
    InternalPort: 4400,
    ExternalPort: getVirtualChainPort(vchainId),
    InternalHttpPort: 8080,
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    AllowAccessToSigner: true,
    AllowAccessToServices: true,
    Config: {
      'gossip-listen-port': 4400,
      'http-address': ':8080',
      'management-file-path': `http://management-service:8080/vchains/${vchainId}/management`,
      'signer-endpoint': 'http://signer:7777',
    },
  };
}
