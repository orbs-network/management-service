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
          EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
          OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
          Ip: '138.103.13.220',
          Port: 10000,
        },
        {
          EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
          OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
          Ip: '225.110.150.90',
          Port: 10000,
        },
        {
          EthAddress: 'cb6642be414696f77336dae06fed3775f08de0ea',
          OrbsAddress: '33546759bdcfb5c753a4102b86b3e73e714d5213',
          Ip: '203.102.66.190',
          Port: 10000,
        },
      ],
      CommitteeEvents: [
        {
          RefTime: isValidTimeRef,
          Committee: [
            {
              OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
              EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
              EffectiveStake: 10000,
              IdentityType: 0,
            },
          ],
        },
        {
          RefTime: isValidTimeRef,
          Committee: [
            {
              OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
              EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
              EffectiveStake: 20000,
              IdentityType: 0,
            },
            {
              OrbsAddress: '16fcf728f8dc3f687132f2157d8379c021a08c12',
              EthAddress: '29ce860a2247d97160d6dfc087a15f41e2349087',
              EffectiveStake: 10000,
              IdentityType: 0,
            },
          ],
        },
        {
          RefTime: isValidTimeRef,
          Committee: [
            {
              OrbsAddress: '7c2300d32ebf4a6ae9edf95f4f57ab5a07488c2e',
              EthAddress: '8a670ddc1910c27278ab7db2a148a0dccc6bf0f5',
              EffectiveStake: 40000,
              IdentityType: 0,
            },
            {
              OrbsAddress: '86544bdd6c8b957cd198252c45fa215fc3892126',
              EthAddress: 'e16e965a4cc3fcd597ecdb9cd9ab8f3e6a750ac9',
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
          },
        },
        {
          RefTime: isValidTimeRef,
          Data: {
            Version: 19,
          },
        },
      ],
    },
  },
};
