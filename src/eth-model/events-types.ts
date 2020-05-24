import { EventData } from 'web3-eth-contract';

export const DEPLOYMENT_SUBSET_MAIN = 'main';
export const DEPLOYMENT_SUBSET_CANARY = 'canary';

export const eventNames: Readonly<Array<EventName>> = [
    'SubscriptionChanged',
    'CommitteeChanged',
    'StandbysChanged',
    'ProtocolVersionChanged',
    'ValidatorRegistered',
];

export type EventName = keyof EventTypes;

export type SubscriptionChangedPayload = {
    vcid: string;
    genRef: string;
    expiresAt: string;
    tier: 'defaultTier';
    deploymentSubset: typeof DEPLOYMENT_SUBSET_MAIN | typeof DEPLOYMENT_SUBSET_CANARY;
};

export type StandbysChangedPayload = {
    addrs: string[];
    orbsAddrs: string[];
};

export type CommitteeChangedPayload = {
    addrs: string[];
    orbsAddrs: string[];
    weights: string[];
};

export type ProtocolChangedPayload = {
    deploymentSubset: string;
    currentVersion: string;
    nextVersion: string;
    fromTimestamp: string;
};

export type ValidatorRegisteredPayload = {
    ip: string;
    orbsAddr: string;
};

export type EventTypes = {
    CommitteeChanged: EventData & { returnValues: CommitteeChangedPayload };
    StandbysChanged: EventData & { returnValues: StandbysChangedPayload };
    SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
    ProtocolVersionChanged: EventData & { returnValues: ProtocolChangedPayload };
    ValidatorRegistered: EventData & { returnValues: ValidatorRegisteredPayload };
};
