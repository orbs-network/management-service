import {
  isValidEthereumAddress,
  isValidTimestamp,
  isNonEmptyString,
  isPositiveNumber,
  isValidImageVersion,
  isValidTimeRef,
} from '../deep-matcher';

export const expectationStatus = {
  Status: isNonEmptyString,
  Timestamp: isValidTimestamp,
  Error: undefined,
  Payload: {
    Uptime: isPositiveNumber,
    MemoryBytesUsed: isPositiveNumber,
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    CurrentCommittee: [],
    CurrentCandidates: [],
    CurrentTopology: [],
    CurrentImageVersions: {
      main: {
        'management-service': isValidImageVersion,
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
      DockerHubPollIntervalSeconds: 1,
      RegularRolloutWindowSeconds: 2,
      HotfixRolloutWindowSeconds: 2,
      EthereumPollIntervalSeconds: 1,
      FinalityBufferBlocks: 10,
      EthereumFirstBlock: 0,
      Verbose: true,
      'node-address': '16fcf728f8dc3f687132f2157d8379c021a08c12',
    },
  },
};
