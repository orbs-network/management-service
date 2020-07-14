import {
  isValidTimeRef,
  isValidEthereumAddress,
  isValidImageVersion,
  isValidBlock,
  isValidTimestamp,
  isNonEmptyString,
  isPositiveNumber,
} from './deep-matcher';

export const expectationStatus = {
  Status: isNonEmptyString,
  Timestamp: isValidTimestamp,
  Error: undefined,
  Payload: {
    Uptime: isPositiveNumber,
    MemoryBytesUsed: isPositiveNumber,
    CurrentRefTime: isValidTimeRef,
    CurrentRefBlock: isValidBlock,
    CurrentCommittee: [
      {
        EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
        Weight: 40000,
        Name: 'Guardian3',
      },
      {
        EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
        Weight: 30000,
        Name: 'Guardian1',
      },
    ],
    CurrentCandidates: [
      {
        EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
        IsStandby: true,
        Name: 'Guardian4',
      },
      {
        EthAddress: '51baa09f2f7dfc7a0f65886b68720958d389cac7',
        IsStandby: true,
        Name: 'Guardian2',
      },
      {
        EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
        IsStandby: true,
        Name: 'Guardian0',
      },
    ],
    CurrentTopology: [
      {
        EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
        OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
        Ip: '41.206.134.10',
        Port: 0,
        Name: 'Guardian0',
      },
      {
        EthAddress: '51baa09f2f7dfc7a0f65886b68720958d389cac7',
        OrbsAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
        Ip: '81.186.160.159',
        Port: 0,
        Name: 'Guardian2',
      },
      {
        EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
        OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
        Ip: '138.103.13.220',
        Port: 0,
        Name: 'Guardian3',
      },
      {
        EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
        OrbsAddress: '33546759bdcfb5c753a4102b86b3e73e714d5213',
        Ip: '203.102.66.190',
        Port: 0,
        Name: 'Guardian4',
      },
      {
        EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
        OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
        Ip: '225.110.150.90',
        Port: 0,
        Name: 'Guardian1',
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
        GenesisRefTime: isValidTimeRef,
        IdentityType: 0,
        RolloutGroup: 'main',
        Tier: 'defaultTier',
      },
      '1000001': {
        Expiration: isValidTimeRef,
        GenesisRefTime: isValidTimeRef,
        IdentityType: 0,
        RolloutGroup: 'canary',
        Tier: 'defaultTier',
      },
      '1000002': {
        Expiration: isValidTimeRef,
        GenesisRefTime: isValidTimeRef,
        IdentityType: 0,
        RolloutGroup: 'main',
        Tier: 'defaultTier',
      },
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
    Guardians: {
      '29ce860a2247d97160d6dfc087a15f41e2349087': {
        EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
        OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
        Ip: '41.206.134.10',
        EffectiveStake: 10000,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: true,
          TimeToStale: 0,
        },
        Name: 'Guardian0',
        Website: 'Guardian0-website',
        Contact: 'Guardian0-contact',
      },
      e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9: {
        EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
        OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
        Ip: '225.110.150.90',
        EffectiveStake: 20000,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: true,
          TimeToStale: isPositiveNumber,
        },
        Name: 'Guardian1',
        Website: 'Guardian1-website',
        Contact: 'Guardian1-contact',
      },
      '51baa09f2f7dfc7a0f65886b68720958d389cac7': {
        EthAddress: '51baa09f2f7dfc7a0f65886b68720958d389cac7',
        OrbsAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
        Ip: '81.186.160.159',
        EffectiveStake: 30000,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: false,
          TimeToStale: 0,
        },
        Name: 'Guardian2',
        Website: 'Guardian2-website',
        Contact: 'Guardian2-contact',
      },
      '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5': {
        EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
        OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
        Ip: '138.103.13.220',
        EffectiveStake: 40000,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: true,
          TimeToStale: isPositiveNumber,
        },
        Name: 'Guardian3',
        Website: 'Guardian3-website',
        Contact: 'Guardian3-contact',
      },
      cb6642be414696f77336dae06fed3775f08de0ea: {
        EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
        OrbsAddress: '33546759bdcfb5c753a4102b86b3e73e714d5213',
        Ip: '203.102.66.190',
        EffectiveStake: 50000,
        ElectionsStatus: {
          LastUpdateTime: isValidTimeRef,
          ReadyToSync: true,
          ReadyForCommittee: false,
          TimeToStale: 0,
        },
        Name: 'Guardian4',
        Website: 'Guardian4-website',
        Contact: 'Guardian4-contact',
      },
    },
    CurrentContractAddress: {
      protocol: isValidEthereumAddress,
      committee: isValidEthereumAddress,
      elections: isValidEthereumAddress,
      delegations: isValidEthereumAddress,
      certification: isValidEthereumAddress,
      staking: isValidEthereumAddress,
      subscriptions: isValidEthereumAddress,
      rewards: isValidEthereumAddress,
    },
    Config: {
      BootstrapMode: false,
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
