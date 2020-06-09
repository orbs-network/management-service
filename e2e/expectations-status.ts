import {
  isValidTimeRef,
  isValidEthereumAddress,
  isValidImageVersion,
  isValidBlock,
  isValidTimestamp,
  isNonEmptyString,
} from './deep-matcher';

export const expectationStatus = {
  Status: isNonEmptyString,
  Timestamp: isValidTimestamp,
  Error: undefined,
  Payload: {
    CurrentRefTime: isValidTimeRef,
    CurrentCommittee: [
      {
        OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
        EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
        Weight: 40000,
        IdentityType: 0,
      },
      {
        OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
        EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
        Weight: 30000,
        IdentityType: 0,
      },
    ],
    CurrentStandbys: [
      {
        OrbsAddress: '33546759bdcfb5c753a4102b86b3e73e714d5213',
        EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
      },
    ],
    CurrentImageVersions: {
      main: {
        'management-service': isValidImageVersion,
        node: isValidImageVersion,
      },
    },
    CurrentImageVersionsUpdater: {
      main: {
        'management-service': {
          LastPollTime: isValidTimeRef,
          PendingVersion: '',
          PendingVersionTime: 0,
        },
        node: {
          LastPollTime: isValidTimeRef,
          PendingVersion: '',
          PendingVersionTime: 0,
        },
      },
    },
    CurrentVirtualChains: {
      '1000000': {
        Expiration: isValidTimeRef,
        GenesisBlock: isValidBlock,
        IdentityType: 0,
        RolloutGroup: 'main',
        Tier: 'defaultTier',
      },
      '1000001': {
        Expiration: isValidTimeRef,
        GenesisBlock: isValidBlock,
        IdentityType: 0,
        RolloutGroup: 'canary',
        Tier: 'defaultTier',
      },
      '1000002': {
        Expiration: isValidTimeRef,
        GenesisBlock: isValidBlock,
        IdentityType: 0,
        RolloutGroup: 'main',
        Tier: 'defaultTier',
      },
    },
    CurrentTopology: [
      {
        EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
        OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
        Ip: '138.103.13.220',
        Port: 0,
      },
      {
        EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
        OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
        Ip: '225.110.150.90',
        Port: 0,
      },
      {
        EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
        OrbsAddress: '33546759bdcfb5c753a4102b86b3e73e714d5213',
        Ip: '203.102.66.190',
        Port: 0,
      },
    ],
    CurrentIp: {
      '29ce860a2247d97160d6dfc087a15f41e2349087': '41.206.134.10',
      e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9: '225.110.150.90',
      '51baa09f2f7dfc7a0f65886b68720958d389cac7': '81.186.160.159',
      '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5': '138.103.13.220',
      cb6642be414696f77336dae06fed3775f08de0ea: '203.102.66.190',
    },
    ProtocolVersionEvents: {
      main: [
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 1,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 19,
          },
        },
      ],
      canary: [
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 1,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 20,
          },
        },
      ],
    },
    Config: {
      Port: 8080,
      EthereumGenesisContract: isValidEthereumAddress,
      EthereumEndpoint: `http://ganache:7545`,
      DockerNamespace: 'orbsnetwork',
      DockerHubPollIntervalSeconds: 1,
      RegularRolloutWindow: 2,
      HotfixRolloutWindow: 2,
      EthereumPollIntervalSeconds: 1,
      FinalityBufferBlocks: 10,
      FirstBlock: 0,
      Verbose: true,
    },
  },
};
