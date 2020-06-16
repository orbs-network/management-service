import { EventData } from 'web3-eth-contract';

export const eventNames: Readonly<Array<EventName>> = [
  'SubscriptionChanged',
  'CommitteeChanged',
  'StandbysChanged',
  'ProtocolVersionChanged',
  'ValidatorDataUpdated',
];

export type EventName = keyof EventTypes;

export type SubscriptionChangedPayload = {
  vcid: string;
  genRefTime: string;
  expiresAt: string;
  tier: 'defaultTier';
  deploymentSubset: 'main' | 'canary';
};

export type StandbysChangedPayload = {
  addrs: string[];
};

export type CommitteeChangedPayload = {
  addrs: string[];
  weights: string[];
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
};

export type EventTypes = {
  CommitteeChanged: EventData & { returnValues: CommitteeChangedPayload };
  StandbysChanged: EventData & { returnValues: StandbysChangedPayload };
  SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
  ProtocolVersionChanged: EventData & { returnValues: ProtocolChangedPayload };
  ValidatorDataUpdated: EventData & { returnValues: ValidatorDataUpdatedPayload };
};
