import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getVirtualChainPort } from './ports';
import { JsonResponse, normalizeAddress } from '../helpers';
import * as Logger from '../logger';
import { parseImageTag } from '../deployment/versioning';
import { services } from '../deployment/deployment-descriptor';


const EXTERNAL_VM_PORTS:any = {
  'vm-notifications':8082,
  'vm-twap':8083,
}
function renderVM(services:JsonResponse, vmName:services, snapshot: StateSnapshot, config: ServiceConfiguration){
  try {
    services[vmName] = getVM(vmName,snapshot, config);
    if(!services[vmName]){
      delete services[vmName];
      Logger.error(`getVM(${vmName}) failed, ${snapshot}`);
      return;
    }
    // exposing ports
    if(EXTERNAL_VM_PORTS[vmName]){
      services[vmName].InternalPort = 80;
      services[vmName].ExternalPort = EXTERNAL_VM_PORTS[vmName];
    }
  } catch (err) {
    Logger.error(err.toString());
  }

}
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
        Url: 'https://github.com/orbs-network/boyarin/releases/download/v1.12.2/boyar-v1.12.2.bin',
        Sha256: 'ed16b868c759fabb0328e0a6d7d4e2cdad9e11ffff661f4a9c59fa0af426a3de',
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

  // include keepers
  try {
    response.services['vm-keepers'] = getKeepers(snapshot, config);
    if (!response.services['vm-keepers']) delete response.services['vm-keepers'];
  } catch (err) {
    Logger.error(err.toString());
  }

  // include odnp open-defi-notification-protocol if found a viable image for it and its contract addresses are known
  renderVM(response.services, 'vm-notifications', snapshot, config);

  // include TWAP TAKER
  renderVM(response.services, 'vm-twap', snapshot, config);

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

  const maticConfig: { [index: string]: any } = {
    ...config.ExternalLaunchConfig,
    BootstrapMode: false,
  };
  maticConfig.Port = 8080;
  maticConfig.EthereumGenesisContract = '0x35eA0D75b2a3aB06393749B4651DfAD1Ffd49A77';
  maticConfig.EthereumEndpoint = config.MaticEndpoint ?? 'https://matic-router.global.ssl.fastly.net';
  maticConfig.EthereumFirstBlock = 21700000;
  maticConfig['node-address'] = config['node-address'];
  maticConfig.EthereumPollIntervalSeconds = 300; // every 5 minutes

  return {
    InternalPort: 8080,
    ExternalPort: 7667,
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    Config: { ...maticConfig },
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

function getKeepers(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main']['vm-keepers'];
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
      ManagementServiceEndpoint: 'http://management-service:8080',
      EthereumEndpoint: 'https://bsc-dataseed1.binance.org/',
      SignerEndpoint: 'http://signer:7777',
      EthereumDiscountGasPriceFactor: 1,
      NodeOrbsAddress: normalizeAddress(config['node-address']),
      BIUrl: 'http://logs.orbs.network:3001/putes/keepers-ew',
      // ElectionsAuditOnly: false,
      // SuspendVoteUnready: false,
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
      EthereumEndpoint: config.MaticEndpoint ?? 'https://matic-router.global.ssl.fastly.net',
      SignerEndpoint: 'http://signer:7777',
      EthereumElectionsContract: '0x94f2da1ef22649c642500e8B1C3252A4670eE95b',
      EthereumDiscountGasPriceFactor: 1,
      NodeOrbsAddress: normalizeAddress(config['node-address']),
      ElectionsAuditOnly: false,
      // SuspendVoteUnready: false,
    },
  };
}

function getVM(vmName:services, snapshot: StateSnapshot, config: ServiceConfiguration) {
  const version = snapshot.CurrentImageVersions['main'][vmName];
  if (!version) return undefined;
  const imageTag = parseImageTag(version);
  if (!imageTag) return undefined;

  const res =  {
    Disabled: false,
    DockerConfig: {
      Image: imageTag.Image,
      Tag: imageTag.Tag,
      Pull: true,
    },
    AllowAccessToSigner: true,
    AllowAccessToServices: true,
    Config: {
      SignerEndpoint: 'http://signer:7777',
      EthereumElectionsContract: '0x02Ca9F2c5dD0635516241efD480091870277865b',
      EthereumDiscountGasPriceFactor: 1,
      NodeOrbsAddress: normalizeAddress(config['node-address']),
    },
  };
  return res;
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
