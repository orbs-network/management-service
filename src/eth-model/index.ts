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
    finalityBufferBlocks: number;
    FirstBlock: number;
    verbose: boolean;
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
        StandbysChanged: new EventModel<EventTypes['StandbysChanged']>(),
        SubscriptionChanged: new EventModel<EventTypes['SubscriptionChanged']>(),
        ProtocolVersionChanged: new EventModel<EventTypes['ProtocolVersionChanged']>(),
        ValidatorRegistered: new EventModel<EventTypes['ValidatorRegistered']>(),
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
        return (await this.reader.getBlockNumber()) - this.config.finalityBufferBlocks;
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
        const latestFinalBlockNumber = await this.getFinalityBar();

        if (this.config.verbose) {
            console.log(
                `pollEvents() getUTCRefTime() = ${await this.getUTCRefTime()} latestFinalBlockNumber = ${latestFinalBlockNumber}`
            );
        }
        const latestBlocks = await Promise.all(eventNames.map((n) => this.pollEvent(n, latestFinalBlockNumber)));
        // console.log('pollEvents() latest blocks: ' + latestBlocks.join());
        return Math.min(...latestBlocks);
    }

    private async pollEvent<T extends EventName>(eventName: T, latestBlockNumber: number): Promise<number> {
        const model = this.getEventModel(eventName);
        const fromBlock = Math.max(model.getNextBlock(), this.config.FirstBlock);
        if (fromBlock <= latestBlockNumber) {
            const toBlock = Math.min(latestBlockNumber, fromBlock + pollSize);
            try {
                const events = (await this.reader.getPastEvents(eventName, { fromBlock, toBlock })).sort(
                    (e1, e2) => e1.blockNumber - e2.blockNumber
                );
                if (this.config.verbose) {
                    console.log(
                        `pollEvent(${eventName}) fromBlock = ${fromBlock} toBlock = ${toBlock} events size ${events.length}`
                    );
                }
                for (const event of events) {
                    const blockTime = await this.blockTime.getExactBlockTime(event.blockNumber);
                    if (blockTime == null) {
                        if (this.config.verbose) {
                            console.log(`got null time reading ${eventName} from block ${event.blockNumber}`);
                        }
                        throw new Error(`got null time reading ${eventName} from block ${event.blockNumber}`);
                    } else {
                        if (this.config.verbose) {
                            console.log(
                                `saving event ${eventName} from time ${blockTime} : ${JSON.stringify(
                                    event.returnValues
                                )}`
                            );
                        }
                        model.rememberEvent(event, blockTime);
                    }
                }
                // assume all blocks till toBlock are read
                model.setNextBlock(toBlock + 1);
            } catch (e) {
                console.error(`failed reading blocks [${fromBlock}-${toBlock}] for ${eventName}: ${errorString(e)}`);
            }
        } else if (this.config.verbose) {
            console.log(`skipping pollEvent(${eventName}), no new final blocks`);
        }
        return model.getNextBlock() - 1;
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

    getIteratorFrom<T extends EventName>(eventName: T, maxTime: number): IterableIterator<Timed & EventTypes[T]> {
        return this.getEventModel(eventName).getIteratorFrom(maxTime);
    }

    getEventModel<T extends EventName>(eventName: T): EventModel<EventTypes[T]> {
        return this.events[eventName] as EventModel<EventTypes[T]>;
    }
}
