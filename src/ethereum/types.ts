import { EventData } from 'web3-eth-contract';

// from https://github.com/orbs-network/orbs-ethereum-contracts-v2/blob/master/test/driver.ts
export type ContractName =
  | 'protocol'
  | 'committee'
  | 'elections'
  | 'delegations'
  | 'guardiansRegistration'
  | 'certification'
  | 'staking'
  | 'subscriptions'
  | 'rewards';

export const eventNames: Readonly<Array<EventName>> = [
  'SubscriptionChanged',
  'GuardianCommitteeChange',
  'StakeChanged',
  'ProtocolVersionChanged',
  'GuardianDataUpdated',
  'GuardianStatusUpdated',
];

export type EventName = keyof EventTypes;

export type SubscriptionChangedPayload = {
  vcid: string;
  genRefTime: string;
  expiresAt: string;
  tier: 'defaultTier';
  deploymentSubset: 'main' | 'canary';
};

export type GuardianCommitteeChangePayload = {
  addr: string;
  weight: string;
  certification: boolean;
  inCommittee: boolean;
};

export type StakeChangedPayload = {
  addr: string;
  selfStake: string;
  delegated_stake: string;
  effective_stake: string;
};

export type ProtocolChangedPayload = {
  deploymentSubset: string;
  currentVersion: string;
  nextVersion: string;
  fromTimestamp: string;
};

export type GuardianDataUpdatedPayload = {
  addr: string;
  ip: string;
  orbsAddr: string;
  name: string;
  website: string;
  contact: string;
};

export type GuardianStatusUpdatedPayload = {
  addr: string;
  readyToSync: boolean;
  readyForCommittee: boolean;
};

export type EventTypes = {
  GuardianCommitteeChange: EventData & { returnValues: GuardianCommitteeChangePayload };
  StakeChanged: EventData & { returnValues: StakeChangedPayload };
  SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
  ProtocolVersionChanged: EventData & { returnValues: ProtocolChangedPayload };
  GuardianDataUpdated: EventData & { returnValues: GuardianDataUpdatedPayload };
  GuardianStatusUpdated: EventData & { returnValues: GuardianStatusUpdatedPayload };
};
