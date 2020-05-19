import { errorString } from '../utils';
import { EventModel, Timed } from './event-model';
import { BlocksTimeModel } from './block-time-model';
import { EventTypes, EventName, eventNames } from './events-types';

/*
goal:
the model holds the last 24+ hours of events per block per vchain (+1 historic if empty)
infinitly per 24h
IPs need diferent model, just keeps latest per orbs address
*/

const pollSize = 1000;

export type ModelConfig = {
    finalityBufferTime: number;
    finalityBufferBlocks: number;
};
export interface Reader {
    getBlockNumber(): Promise<number>;
    getRefTime(blockNumber: number | 'latest'): Promise<number | null>;
    getPastEvents<T extends EventName>(
        eventName: T,
        range: { fromBlock: number; toBlock: number }
    ): Promise<Array<EventTypes[T]>>;
}

export class EthereumModel {
    private events = {
        CommitteeChanged: new EventModel<EventTypes['CommitteeChanged']>(),
        TopologyChanged: new EventModel<EventTypes['TopologyChanged']>(),
        SubscriptionChanged: new EventModel<EventTypes['SubscriptionChanged']>(),
        ProtocolVersionChanged: new EventModel<EventTypes['ProtocolVersionChanged']>(),
    };
    // private events = new Map<EventName, EventModel>();
    blockTime: BlocksTimeModel;
    constructor(private reader: Reader, private config: ModelConfig) {
        this.blockTime = new BlocksTimeModel((blockNumber: number) => this.reader.getRefTime(blockNumber));
    }

    async getUTCRefTime(): Promise<number> {
        const earliestNextBlock = Math.min(...eventNames.map((n) => this.events[n].getNextBlock()));
        const result = await this.blockTime.getExactBlockTime(Math.max(earliestNextBlock - 1, 0));
        if (typeof result !== 'number') {
            console.error(`error getting time for block ${earliestNextBlock}`);
            return -1;
        }
        return result;
    }
    async getFinalityBar() {
        const latestBlockNumber = await this.reader.getBlockNumber();
        const latestFinalBlockNumber = latestBlockNumber - this.config.finalityBufferBlocks;
        const finalityTime = Math.min(
            ((await this.reader.getRefTime(latestBlockNumber)) || 0) - this.config.finalityBufferTime,
            (await this.reader.getRefTime(latestFinalBlockNumber)) || 0
        );
        return [latestFinalBlockNumber, finalityTime];
    }

    /*
    todo: generate requests and batch them ?
    var batch = new web3.BatchRequest();
    batch.add(web3.eth.getBalance.request('0x0000000000000000000000000000000000000000', 'latest', callback));
    batch.add(contract.methods.balance(address).call.request({from: '0x0000000000000000000000000000000000000000'}, callback2));
    batch.execute();
    */
    async pollEvents(): Promise<number> {
        // determine latest block after finality concerns
        const [latestFinalBlockNumber, finalityTime] = await this.getFinalityBar();
        const latestBlocks = await Promise.all(
            eventNames.map((n) => this.pollEvent(n, latestFinalBlockNumber, finalityTime + 1))
        );
        // console.log('pollEvents() latest blocks: ' + latestBlocks.join());
        return Math.min(...latestBlocks);
    }

    private async pollEvent<T extends EventName>(
        eventName: T,
        latestBlockNumber: number,
        finalityTime: number
    ): Promise<number> {
        const model = this.getEventModel(eventName);
        // todo move into cache?
        const fromBlock = model.getNextBlock();
        const toBlock = Math.min(latestBlockNumber, fromBlock + pollSize);
        let latestBlock = fromBlock;
        let skipped = false;
        // TODO pagination
        try {
            const events = await this.reader.getPastEvents(eventName, { fromBlock, toBlock });
            for (const event of events) {
                const blockTime = await this.blockTime.getExactBlockTime(event.blockNumber, finalityTime);
                if (blockTime == null) {
                    throw new Error(`got null reading block ${event.blockNumber}`);
                } else if (blockTime > 0) {
                    model.rememberEvent(event, blockTime);
                    latestBlock = Math.max(latestBlock, event.blockNumber);
                } else {
                    skipped = true;
                }
            }
            if (skipped) {
                model.setNextBlock(latestBlock + 1);
            } else {
                // assume all blocks till toBlock are read
                model.setNextBlock(toBlock + 1);
                latestBlock = toBlock;
            }
        } catch (e) {
            console.error(`failed reading blocks [${fromBlock}-${toBlock}] for ${eventName}: ${errorString(e)}`);
        }
        return latestBlock;
    }

    getEventsFromTime<T extends EventName>(
        eventName: T,
        fromTime: number,
        toTime: number
    ): Array<Timed & EventTypes[T]> {
        return this.getEventModel(eventName).getEvents(fromTime, toTime);
    }

    getLastEvent<T extends EventName>(eventName: T, maxTime: number): Timed & EventTypes[T] {
        return this.getEventModel(eventName).getLastEvent(maxTime);
    }

    getEventModel<T extends EventName>(eventName: T): EventModel<EventTypes[T]> {
        return this.events[eventName] as EventModel<EventTypes[T]>;
    }
}
