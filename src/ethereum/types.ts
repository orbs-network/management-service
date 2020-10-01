import { Contracts } from '@orbs-network/orbs-ethereum-contracts-v2/release/typings/contracts';
import { EventData } from 'web3-eth-contract';

// contracts

// from https://github.com/orbs-network/orbs-ethereum-contracts-v2/blob/master/test/driver.ts
export type ContractName =
  | 'contractRegistry' // added although not found in orbs-ethereum-contracts-v2 ContractName
  | 'protocol'
  | 'committee'
  | 'elections'
  | 'delegations'
  | 'guardiansRegistration'
  | 'certification'
  | 'staking'
  | 'subscriptions'
  | 'rewards';

export type ContractTypeName = keyof Contracts;

// TODO: this type is needed just for getting the abi from orbs-ethereum-contracts-v2/compiledContracts[contractType]
// once we have a nicer mechanism for abi, it should be indexed by ContractName and this type should be retired
export function getContractTypeName(key: ContractName): ContractTypeName {
  switch (key) {
    case 'contractRegistry':
      return 'ContractRegistry';
    case 'protocol':
      return 'Protocol';
    case 'committee':
      return 'Committee';
    case 'elections':
      return 'Elections';
    case 'delegations':
      return 'Delegations';
    case 'guardiansRegistration':
      return 'GuardiansRegistration';
    case 'certification':
      return 'Certification';
    case 'staking':
      return 'StakingContract';
    case 'subscriptions':
      return 'Subscriptions';
    case 'rewards':
      return 'Rewards';
    default:
      throw new Error(`unknown contract name '${key}'`);
  }
}

// events

export const eventNames: Readonly<Array<EventName>> = [
  'ContractAddressUpdated',
  'SubscriptionChanged',
  'GuardianCommitteeChange',
  'StakeChanged',
  'ProtocolVersionChanged',
  'GuardianDataUpdated',
  'GuardianStatusUpdated',
  'GuardianMetadataChanged',
];

export type EventName = keyof EventTypes;

export function contractByEventName(eventName: EventName): ContractName {
  switch (eventName) {
    case 'ContractAddressUpdated':
      return 'contractRegistry';
    case 'GuardianCommitteeChange':
      return 'committee';
    case 'StakeChanged':
      return 'elections';
    case 'SubscriptionChanged':
      return 'subscriptions';
    case 'ProtocolVersionChanged':
      return 'protocol';
    case 'GuardianDataUpdated':
      return 'guardiansRegistration';
    case 'GuardianStatusUpdated':
      return 'elections';
    case 'GuardianMetadataChanged':
      return 'guardiansRegistration';
    default:
      throw new Error(`unknown event name '${eventName}'`);
  }
}

export type ContractAddressUpdatedPayload = {
  contractName: ContractName;
  addr: string;
  managedContract: boolean;
};

export type SubscriptionChangedPayload = {
  vcid: string;
  owner: string;
  name: string;
  genRefTime: string;
  tier: 'defaultTier';
  rate: string;
  expiresAt: string;
  isCertified: boolean;
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
  isRegistered: boolean;
  ip: string;
  orbsAddr: string;
  name: string;
  website: string;
};

export type GuardianMetadataChangedPayload = {
  addr: string;
  key: string;
  newValue: string;
  oldValue: string;
};

export type GuardianStatusUpdatedPayload = {
  addr: string;
  readyToSync: boolean;
  readyForCommittee: boolean;
};

export type EventTypes = {
  ContractAddressUpdated: EventData & { returnValues: ContractAddressUpdatedPayload };
  GuardianCommitteeChange: EventData & { returnValues: GuardianCommitteeChangePayload };
  StakeChanged: EventData & { returnValues: StakeChangedPayload };
  SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
  ProtocolVersionChanged: EventData & { returnValues: ProtocolChangedPayload };
  GuardianDataUpdated: EventData & { returnValues: GuardianDataUpdatedPayload };
  GuardianStatusUpdated: EventData & { returnValues: GuardianStatusUpdatedPayload };
  GuardianMetadataChanged: EventData & { returnValues: GuardianMetadataChangedPayload };
};
