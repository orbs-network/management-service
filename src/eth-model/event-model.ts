import { EventData } from 'web3-eth-contract';

export type Timed = { time: number };

export type EventBlockData<T extends EventData> = {
    time: number;
    blockNumber: number;
    events: Array<Timed & T>;
};

/**
 * creates a matcher for given event within the same block.
 * used to de-dupe events in block model
 */
function getEventMatcher(event: EventData) {
    if (event.transactionHash && typeof event.logIndex != 'undefined') {
        return (e: EventData) => e.transactionHash === event.transactionHash && e.logIndex === event.logIndex;
    } else {
        // mock data, never drop
        return () => false;
    }
}

// TODO what happens in a re-org? should we confirm blockHash of events match block ?
export class EventModel<T extends EventData> {
    private eventsPerBlock = new Array<EventBlockData<T>>();
    private topBlock = 0;
    constructor() {
        this.eventsPerBlock.push({ time: -1, blockNumber: -1, events: [] }); // invariant: this.eventsPerBlock has to be at least 1
    }

    getTopBlock() {
        return Math.max(this.topBlock, this.eventsPerBlock[this.eventsPerBlock.length - 1].blockNumber);
    }

    setTopBlock(nextBlock: number) {
        this.topBlock = nextBlock;
    }
    rememberEvent(event: T, blockTime: number) {
        for (let i = this.eventsPerBlock.length - 1; i >= 0; --i) {
            const block = this.eventsPerBlock[i];
            const timedEvent = { time: blockTime, ...event };
            if (block.blockNumber == event.blockNumber) {
                // no duplicate events
                if (!block.events.find(getEventMatcher(event))) {
                    block.events.push(timedEvent);
                }
                return;
            } else if (block.blockNumber < event.blockNumber) {
                // create new block here
                this.eventsPerBlock.splice(i + 1, 0, {
                    time: blockTime,
                    blockNumber: event.blockNumber,
                    events: [timedEvent],
                });
                return;
            }
        }
        throw new Error(`can't find place for event : ${JSON.stringify(event)}`);
    }

    getIndexOfBlocksNearTime(time: number): { prev: number; next: number } {
        if (this.eventsPerBlock.length < 1) {
            throw new Error('invariant broken: this.eventsPerBlock has to be at least 1');
        }
        let min = 0;
        let max = this.eventsPerBlock.length - 1;
        while (min <= max) {
            const k = Math.floor((max + min) / 2);
            if (this.eventsPerBlock[k].time < time) {
                // too early
                min = k + 1;
            } else if (this.eventsPerBlock[k].time > time) {
                // too late
                max = k - 1;
            } else {
                return { prev: k, next: k }; // the idx of the events exactly at time
            }
        }
        return { prev: max, next: min };
    }

    getEvents(fromTime: number, toTime: number): (Timed & T)[] {
        const blocksNearFrom = this.getIndexOfBlocksNearTime(fromTime);
        const blocksNearTo = this.getIndexOfBlocksNearTime(toTime);
        const singleBlockRange = fromTime === toTime && blocksNearTo.prev == blocksNearTo.next; // edge case
        const eventsInRange = blocksNearFrom.prev < blocksNearTo.prev || singleBlockRange;
        if (eventsInRange) {
            // slice and dice events from blocks range
            return this.eventsPerBlock.slice(blocksNearFrom.next, blocksNearTo.prev + 1).flatMap((b) => b.events);
        } else {
            if (blocksNearFrom.prev) {
                // edge case : no events in range, return last event
                return [this.lastBlockEvent(blocksNearFrom.prev)];
            } else {
                // double edgeed case : before first event
                return [];
            }
        }
    }

    private lastBlockEvent(blockIdx: number) {
        const blockEvents = this.eventsPerBlock[blockIdx].events;
        return blockEvents[blockEvents.length - 1];
    }

    getLastEvent(maxTime: number): Timed & T {
        const blockIdx = this.getIndexOfBlocksNearTime(maxTime).prev;
        return this.lastBlockEvent(blockIdx);
    }

    getIteratorFrom(maxTime: number): IterableIterator<Timed & T> {
        return this.getIterator(this.getIndexOfBlocksNearTime(maxTime).prev);
    }

    /**
     * iterate over all events from specific block backwards in time
     * @param blockIdx start of iteration (inclusive, unless is 0 which marks events epoch)
     */
    private getIterator(blockIdx: number): IterableIterator<Timed & T> {
        const eventsPerBlock = this.eventsPerBlock;
        let eventIdx = eventsPerBlock[blockIdx].events.length - 1;
        return {
            [Symbol.iterator]() {
                return this;
            },
            next() {
                if (blockIdx === 0) {
                    // before first event
                    return { value: undefined, done: true };
                } else {
                    const value = eventsPerBlock[blockIdx].events[eventIdx];
                    if (eventIdx > 0) {
                        eventIdx--;
                    } else {
                        blockIdx--;
                        eventIdx = eventsPerBlock[blockIdx].events.length - 1;
                    }
                    return { value, done: false };
                }
            },
        };
    }
}
