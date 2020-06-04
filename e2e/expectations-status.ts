import { isValidTimeRef, isValidEthereumAddress, isValidImageVersion, isValidBlock } from './deep-matcher';

export const expectationStatus = {
  CurrentRefTime: isValidTimeRef,
  CurrentCommittee: [
    {
      OrbsAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
      EthAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
      EffectiveStake: 40000,
      IdentityType: 0,
    },
    {
      OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      EffectiveStake: 20000,
      IdentityType: 0,
    },
  ],
  CurrentStandbys: [
    {
      EthAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
      OrbsAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
    },
  ],
  CurrentImageVersions: {
    main: {
      'management-service': isValidImageVersion,
      node: isValidImageVersion,
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
      EthAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
      OrbsAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
      Ip: '23.77.195.180',
      Port: 0,
    },
    {
      EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
      OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
      Ip: '22.252.247.40',
      Port: 0,
    },
    {
      EthAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
      OrbsAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
      Ip: '124.35.0.211',
      Port: 0,
    },
  ],
  CurrentIp: {
    '3fced656acbd6700ce7d546f6efdcdd482d8142a': '63.206.214.86',
    '16fcf728f8dc3f687132f2157d8379c021a08c12': '22.252.247.40',
    '86544bdd6c8b957cd198252c45fa215fc3892126': '134.84.75.221',
    '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69': '23.77.195.180',
    '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e': '124.35.0.211',
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
    EthereumPollIntervalSeconds: 1,
    FinalityBufferBlocks: 10,
    FirstBlock: 0,
    Verbose: true,
  },
};
