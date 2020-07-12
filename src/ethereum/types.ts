import { EventData } from 'web3-eth-contract';

// from https://github.com/orbs-network/orbs-ethereum-contracts-v2/blob/master/test/driver.ts
export type ContractName =
  | 'protocol'
  | 'committee'
  | 'elections'
  | 'delegations'
  | 'validatorsRegistration'
  | 'compliance'
  | 'staking'
  | 'subscriptions'
  | 'rewards';

export const eventNames: Readonly<Array<EventName>> = [
  'SubscriptionChanged',
  'ValidatorCommitteeChange',
  'StakeChanged',
  'ProtocolVersionChanged',
  'ValidatorDataUpdated',
  'ValidatorStatusUpdated',
];

export type EventName = keyof EventTypes;

export type SubscriptionChangedPayload = {
  vcid: string;
  genRefTime: string;
  expiresAt: string;
  tier: 'defaultTier';
  deploymentSubset: 'main' | 'canary';
};

export type ValidatorCommitteeChangePayload = {
  addr: string;
  weight: string;
  compliance: boolean;
  inCommittee: boolean;
  isStandby: boolean;
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

export type ValidatorDataUpdatedPayload = {
  addr: string;
  ip: string;
  orbsAddr: string;
  name: string;
  website: string;
  contact: string;
};

export type ValidatorStatusUpdatedPayload = {
  addr: string;
  readyToSync: boolean;
  readyForCommittee: boolean;
};

export type EventTypes = {
  ValidatorCommitteeChange: EventData & { returnValues: ValidatorCommitteeChangePayload };
  StakeChanged: EventData & { returnValues: StakeChangedPayload };
  SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
  ProtocolVersionChanged: EventData & { returnValues: ProtocolChangedPayload };
  ValidatorDataUpdated: EventData & { returnValues: ValidatorDataUpdatedPayload };
  ValidatorStatusUpdated: EventData & { returnValues: ValidatorStatusUpdatedPayload };
};
