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

export type TopologyChangedayload = {
    orbsAddrs: string[];
    ips: string[];
};

export type EventTypes = {
    CommitteeChanged: EventData;
    TopologyChanged: EventData;
    SubscriptionChanged: EventData & { returnValues: SubscriptionChangedPayload };
    ProtocolVersionChanged: EventData;
};
