import { isValidTimeRef } from './deep-matcher';

export const expectationVcManagement = {
  CurrentRefTime: isValidTimeRef,
  PageStartRefTime: 0,
  PageEndRefTime: isValidTimeRef,
  VirtualChains: {
    '1000000': {
      VirtualChainId: 1000000,
      GenesisRefTime: isValidTimeRef,
      CurrentTopology: [
        {
          EthAddress: '174dc3b45bdbbc32aa0b95e64d0247ce99b08f69',
          OrbsAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
          Ip: '23.77.195.180',
          Port: 10000,
        },
        {
          EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
          OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
          Ip: '22.252.247.40',
          Port: 10000,
        },
        {
          EthAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
          OrbsAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
          Ip: '124.35.0.211',
          Port: 10000,
        },
      ],
      CommitteeEvents: [
        {
          RefTime: isValidTimeRef,
          Committee: [
            {
              OrbsAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
              EthAddress: '3fced656acbd6700ce7d546f6efdcdd482d8142a',
              EffectiveStake: 10000,
              IdentityType: 0,
            },
          ],
        },
        {
          RefTime: isValidTimeRef,
          Committee: [
            {
              OrbsAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
              EthAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
              EffectiveStake: 20000,
              IdentityType: 0,
            },
            {
              OrbsAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
              EthAddress: '3fced656acbd6700ce7d546f6efdcdd482d8142a',
              EffectiveStake: 10000,
              IdentityType: 0,
            },
          ],
        },
        {
          RefTime: isValidTimeRef,
          Committee: [
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
        },
      ],
      SubscriptionEvents: [
        {
          RefTime: isValidTimeRef,
          Data: {
            Status: 'active',
            Tier: 'defaultTier',
            RolloutGroup: 'main',
            IdentityType: 0,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Status: 'expired',
            Tier: 'defaultTier',
            RolloutGroup: 'main',
            IdentityType: 0,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Status: 'active',
            Tier: 'defaultTier',
            RolloutGroup: 'main',
            IdentityType: 0,
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Status: 'expired',
            Tier: 'defaultTier',
            RolloutGroup: 'main',
            IdentityType: 0,
          },
        },
      ],
      ProtocolVersionEvents: [
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 1,
            RolloutGroup: 'main',
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 19,
            RolloutGroup: 'main',
          },
        },
      ],
    },
  },
};
