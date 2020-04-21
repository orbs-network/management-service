import { SubscriptionEvent } from '../data-types';
import { EventTypes } from './events-types';

export function translateSubscriptionChangedEvent(value: EventTypes['SubscriptionChanged']): SubscriptionEvent {
    return {
        RefTime: value.blockNumber,
        Data: {
            // Status: string;
            // Tier: string;
            // RolloutGroup: string;
            // IdentityType: IdentityType;
            // Params: object;
        },
    };
}
