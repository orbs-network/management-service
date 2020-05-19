import { EventData } from 'web3-eth-contract';

export const DEPLOYMENT_SUBSET_MAIN = 'main';
export const DEPLOYMENT_SUBSET_CANARY = 'canary';

export const eventNames: Readonly<Array<EventName>> = [
    'CommitteeChanged',
    'TopologyChanged',
    'SubscriptionChanged',
    'ProtocolVersionChanged',
];

export type EventName = keyof EventTypes;

export type SubscriptionChangedPayload = {
    vcid: string;
    genRef: string;
    expiresAt: string;
    tier: 'defaultTier';
    deploymentSubset: typeof DEPLOYMENT_SUBSET_MAIN | typeof DEPLOYMENT_SUBSET_CANARY;
};

export type TopologyChangedPayload = {
    orbsAddrs: string[];
    ips: string[];
};

export type CommitteeChangedPayload = {
    addrs: string[];
    orbsAddrs: string[];
    stakes: string[];
};

export type EventTypes = {
    CommitteeChanged: EventData & { returnValues: TopologyChangedPayload };
    TopologyChanged: EventData & { returnValues: TopologyChangedPayload };
    SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
    ProtocolVersionChanged: EventData;
};
