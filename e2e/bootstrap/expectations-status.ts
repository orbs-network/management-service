import {
  isValidEthereumAddress,
  isValidTimestamp,
  isNonEmptyString,
  isPositiveNumber,
  isValidTimeRef,
  isValidFullImageName,
} from '../deep-matcher';

export const expectationStatus = {
  Status: isNonEmptyString,
  Timestamp: isValidTimestamp,
  Error: undefined,
  Payload: {
    Uptime: isPositiveNumber,
    MemoryUsage: {
      heapUsed: isPositiveNumber,
      rss: isPositiveNumber,
    },
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    EventsStats: {
      LastUpdateBlock: 0,
      TotalEventsProcessed: 0,
      EventCount: [
        {Count: isPositiveNumber}
      ]
    },
    CurrentCommittee: [],
    CurrentCandidates: [],
    CurrentTopology: [],
    CurrentImageVersions: {
      main: {
        'management-service': isValidFullImageName,
      },
      canary: {},
    },
    CurrentImageVersionsUpdater: {
      main: {
        'management-service': {
          LastPollTime: isValidTimeRef,
          PendingVersion: '',
          PendingVersionTime: 0,
        },
      },
      canary: {},
    },
    CurrentVirtualChains: {},
    ProtocolVersionEvents: { main: [], canary: [] },
    CurrentContractAddress: {},
    Guardians: {},
    Config: {
      BootstrapMode: true,
      Port: 8080,
      EthereumGenesisContract: isValidEthereumAddress,
      EthereumEndpoint: `http://ganache:7545`,
      DockerNamespace: 'orbsnetwork',
      StatusWriteIntervalSeconds: 1,
      DeploymentDescriptorPollIntervalSeconds: 1,
      RegularRolloutWindowSeconds: 2,
      HotfixRolloutWindowSeconds: 2,
      EthereumPollIntervalSeconds: 1,
      FinalityBufferBlocks: 10,
      EthereumFirstBlock: 0,
      Verbose: true,
      'node-address': 'ecfcCcbc1E54852337298c7E90f5eceE79439e67',
      ExternalLaunchConfig: {
        BootstrapMode: true,
        Port: 8080,
        EthereumGenesisContract: isValidEthereumAddress,
        EthereumEndpoint: `http://ganache:7545`,
        DockerNamespace: 'orbsnetwork',
        StatusWriteIntervalSeconds: 1,
        DeploymentDescriptorPollIntervalSeconds: 1,
        RegularRolloutWindowSeconds: 2,
        HotfixRolloutWindowSeconds: 2,
        EthereumPollIntervalSeconds: 1,
        FinalityBufferBlocks: 10,
        EthereumFirstBlock: 0,
        Verbose: true,
        'node-address': 'ecfcCcbc1E54852337298c7E90f5eceE79439e67',
      },
    },
  },
};
