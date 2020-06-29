import { EventData } from 'web3-eth-contract';

export const eventNames: Readonly<Array<EventName>> = [
  'SubscriptionChanged',
  'ValidatorCommitteeChange',
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

export type ValidatorStatusUpdatedPayload = {
  addr: string;
  readyToSync: boolean;
  readyForCommittee: boolean;
};

export type EventTypes = {
  ValidatorCommitteeChange: EventData & { returnValues: ValidatorCommitteeChangePayload };
  SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
  ProtocolVersionChanged: EventData & { returnValues: ProtocolChangedPayload };
  ValidatorDataUpdated: EventData & { returnValues: ValidatorDataUpdatedPayload };
  ValidatorStatusUpdated: EventData & { returnValues: ValidatorStatusUpdatedPayload };
};
