import { EventData } from 'web3-eth-contract';
import {
  ContractRegistryKey,
  getAbiByContractAddress,
  getAbiByContractRegistryKey,
  getAbiByContractName,
} from '@orbs-network/orbs-ethereum-contracts-v2';

// contracts

// we use the lowercase names for contracts that are also used as keys in the contract registry
// 'contractRegistry' is unique because it's not a key in the contract registry
export type ContractName = 'contractRegistry' | ContractRegistryKey;

// events

export const eventNames: Readonly<Array<EventName>> = [
  'ContractAddressUpdated',
  'SubscriptionChanged',
  'CommitteeChange',
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
    case 'CommitteeChange':
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
  vcId: string;
  owner: string;
  name: string;
  genRefTime: string;
  tier: 'defaultTier';
  rate: string;
  expiresAt: string;
  isCertified: boolean;
  deploymentSubset: 'main' | 'canary';
};

export type CommitteeChangePayload = {
  addr: string;
  weight: string;
  certification: boolean;
  inCommittee: boolean;
};

export type StakeChangedPayload = {
  addr: string;
  selfDelegatedStake: string;
  delegatedStake: string;
  effectiveStake: string;
};

export type ProtocolVersionChangedPayload = {
  deploymentSubset: string;
  currentVersion: string;
  nextVersion: string;
  fromTimestamp: string;
};

export type GuardianDataUpdatedPayload = {
  guardian: string;
  isRegistered: boolean;
  ip: string;
  orbsAddr: string;
  name: string;
  website: string;
  registrationTime: string;
};

export type GuardianMetadataChangedPayload = {
  guardian: string;
  key: string;
  newValue: string;
  oldValue: string;
};

export type GuardianStatusUpdatedPayload = {
  guardian: string;
  readyToSync: boolean;
  readyForCommittee: boolean;
};

export type EventTypes = {
  ContractAddressUpdated: EventData & { returnValues: ContractAddressUpdatedPayload };
  CommitteeChange: EventData & { returnValues: CommitteeChangePayload };
  StakeChanged: EventData & { returnValues: StakeChangedPayload };
  SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
  ProtocolVersionChanged: EventData & { returnValues: ProtocolVersionChangedPayload };
  GuardianDataUpdated: EventData & { returnValues: GuardianDataUpdatedPayload };
  GuardianStatusUpdated: EventData & { returnValues: GuardianStatusUpdatedPayload };
  GuardianMetadataChanged: EventData & { returnValues: GuardianMetadataChangedPayload };
};

export function getAbiForContract(address: string, contractName: ContractName) {
  // attempts to get the ABI by address first (useful for deprecated contracts and breaking ABI changes)
  const abi = getAbiByContractAddress(address);
  if (abi) return abi;

  // if address is unknown, rely on the latest ABI's (useful for testing mostly)
  if (contractName === 'contractRegistry') return getAbiByContractName('ContractRegistry');
  else return getAbiByContractRegistryKey(contractName);
}
