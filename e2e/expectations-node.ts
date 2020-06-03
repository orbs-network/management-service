import { isValidImageVersion, isValidEthereumAddress } from './deep-matcher';
import { getVirtualChainPort } from '../src/api/helpers';

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
        'management-consensus-grace-timeout': '0s',
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
};
