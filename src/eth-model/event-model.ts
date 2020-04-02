import { EventData } from 'web3-eth-contract';

export type EventBlockData = {
    time: number;
    blockNumber: number;
    events: Array<EventData>;
};

export class EventModel {
    private eventsPerBlock = new Array<EventBlockData>();

    constructor(firstBlock: number) {
        this.eventsPerBlock.push({ time: -1, blockNumber: firstBlock - 1, events: [] });
    }

    getNextBlock() {
        return this.eventsPerBlock[this.eventsPerBlock.length - 1].blockNumber + 1;
    }

    rememberEvent(event: EventData, blockTime: number) {
        for (let i = this.eventsPerBlock.length - 1; i >= 0; --i) {
            const block = this.eventsPerBlock[i];
            if (block.blockNumber == event.blockNumber) {
                block.events.push(event);
                return;
            } else if (block.blockNumber < event.blockNumber) {
                // create new block here
                this.eventsPerBlock.splice(i + 1, 0, {
                    time: blockTime,
                    blockNumber: event.blockNumber,
                    events: [event],
                });
                return;
            }
        }
        throw new Error(`can't find place for event : ${JSON.stringify(event)}`);
    }
}
