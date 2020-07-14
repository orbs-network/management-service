import { isValidImageVersion, isValidEthereumAddress } from '../deep-matcher';

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
    'management-service': {
      InternalPort: 8080,
      ExternalPort: 7666,
      Disabled: false,
      DockerConfig: {
        Image: 'orbsnetwork/management-service',
        Tag: isValidImageVersion,
        Pull: true,
      },
      Config: {
        BootstrapMode: false,
        Port: 8080,
        DockerNamespace: 'orbsnetwork',
        DockerHubPollIntervalSeconds: 1,
        EthereumPollIntervalSeconds: 1,
        EthereumFirstBlock: 0,
        FinalityBufferBlocks: 10,
        Verbose: true,
        EthereumGenesisContract: isValidEthereumAddress,
        EthereumEndpoint: 'http://ganache:7545',
        'node-address': '16fcf728f8dc3f687132f2157d8379c021a08c12',
      },
    },
  },
  chains: [],
};
