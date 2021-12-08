import { isValidImageVersion, isValidEthereumAddress } from './deep-matcher';
import { getVirtualChainPort } from '../src/api/ports';

export const expectationNodeManagement = {
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
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetwork/signer',
        Tag: isValidImageVersion,
        Pull: true,
      },
      Config: {
        api: 'v1',
      },
    },
    'management-service': {
      InternalPort: 8080,
      ExternalPort: 7666,
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetworkstaging/management-service',
        Tag: isValidImageVersion,
        Pull: true,
      },
      Config: {
        BootstrapMode: false,
        Port: 8080,
        DockerNamespace: 'orbsnetwork',
        StatusWriteIntervalSeconds: 1,
        DeploymentDescriptorPollIntervalSeconds: 1,
        EthereumPollIntervalSeconds: 1,
        EthereumFirstBlock: 0,
        FinalityBufferBlocks: 10,
        Verbose: true,
        EthereumGenesisContract: isValidEthereumAddress,
        EthereumEndpoint: 'http://ganache:7545',
        'node-address': 'ecfcCcbc1E54852337298c7E90f5eceE79439e67',
      },
    },
    'matic-reader': {
      InternalPort: 8080,
      ExternalPort: 7667,
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetworkstaging/management-service',
        Tag: isValidImageVersion,
        Pull: true,
      },
      Config: {
        BootstrapMode: false,
        Port: 8080,
        DockerNamespace: 'orbsnetwork',
        StatusWriteIntervalSeconds: 1,
        DeploymentDescriptorPollIntervalSeconds: 1,
        EthereumPollIntervalSeconds: 1,
        EthereumFirstBlock: 0,
        FinalityBufferBlocks: 10,
        Verbose: true,
        EthereumGenesisContract: isValidEthereumAddress,
        EthereumEndpoint: 'http://ganache:7545',
        'node-address': 'ecfcCcbc1E54852337298c7E90f5eceE79439e67',
      },
    },
    'ethereum-writer': {
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetwork/ethereum-writer',
        Tag: isValidImageVersion,
        Pull: true,
      },
      AllowAccessToSigner: true,
      AllowAccessToServices: true,
      Config: {
        ManagementServiceEndpoint: 'http://management-service:8080',
        EthereumEndpoint: 'http://ganache:7545',
        SignerEndpoint: 'http://signer:7777',
        EthereumElectionsContract: isValidEthereumAddress,
        NodeOrbsAddress: 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
        ElectionsAuditOnly: false,
      },
    },
    'matic-writer': {
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetwork/ethereum-writer',
        Tag: isValidImageVersion,
        Pull: true,
      },
      AllowAccessToSigner: true,
      AllowAccessToServices: true,
      Config: {
        ManagementServiceEndpoint: 'http://matic-reader:8080',
        EthereumEndpoint: 'http://ganache:7545',
        SignerEndpoint: 'http://signer:7777',
        EthereumElectionsContract: isValidEthereumAddress,
        NodeOrbsAddress: 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
        ElectionsAuditOnly: false,
      },
    },
    'logs-service': {
      InternalPort: 8080,
      ExternalPort: 8666,
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetwork/logs-service',
        Tag: isValidImageVersion,
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
      AllowAccessToSigner: true,
      AllowAccessToServices: true,
      Config: {
        'gossip-listen-port': 4400,
        'http-address': ':8080',
        'management-file-path': `http://management-service:8080/vchains/${vcId}/management`,
        'signer-endpoint': 'http://signer:7777',
      },
    };
  }),
};
