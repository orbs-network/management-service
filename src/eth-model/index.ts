import { errorString } from '../utils';
import { EventModel, Timed } from './event-model';
import { BlocksTimeModel } from './block-time-model';
import { EthereumReader } from '../ethereum-reader';
import { EventTypes, EventName, eventNames } from './events-types';

/*
goal:
the model holds the last 24+ hours of events per block per vchain (+1 historic if empty)
infinitly per 24h
IPs need diferent model, just keeps latest per orbs address
*/

const pollSize = 1000;

export class EthereumModel {
    private events = {
        CommitteeChanged: new EventModel<EventTypes['CommitteeChanged']>(),
        TopologyChanged: new EventModel<EventTypes['TopologyChanged']>(),
        SubscriptionChanged: new EventModel<EventTypes['SubscriptionChanged']>(),
        ProtocolVersionChanged: new EventModel<EventTypes['ProtocolVersionChanged']>(),
    };
    // private events = new Map<EventName, EventModel>();
    blockTime: BlocksTimeModel;
    constructor(private reader: EthereumReader) {
        this.blockTime = new BlocksTimeModel((blockNumber: number) => this.reader.getRefTime(blockNumber), 100);
    }

    async pollEvents(): Promise<number> {
        const latestBlockNumber = await this.reader.getBlockNumber(); // TODO will throw on errors
        /*
        todo: generate requests and batch them ?
        var batch = new web3.BatchRequest();
        batch.add(web3.eth.getBalance.request('0x0000000000000000000000000000000000000000', 'latest', callback));
        batch.add(contract.methods.balance(address).call.request({from: '0x0000000000000000000000000000000000000000'}, callback2));
        batch.execute();
        */
        const latestBlocks = await Promise.all(eventNames.map((n) => this.pollEvent(n, latestBlockNumber)));
        // console.log('pollEvents() latest blocks: ' + latestBlocks.join());
        return Math.min(...latestBlocks);
    }

    private async pollEvent<T extends EventName>(eventName: T, latestBlockNumber: number): Promise<number> {
        const model = this.getEventModel(eventName);
        // todo move into cache?
        const fromBlock = model.getNextBlock();
        const toBlock = Math.min(latestBlockNumber, fromBlock + pollSize);
        let latestBlock = fromBlock;
        // TODO pagination
        try {
            const events = await this.reader.getPastEvents(eventName, { fromBlock, toBlock });
            for (const event of events) {
                const blockTime = await this.blockTime.getExactBlockTime(event.blockNumber);
                if (blockTime == null) {
                    throw new Error(`got null reading block ${blockTime}`);
                }
                model.rememberEvent(event, blockTime);
                latestBlock = Math.max(latestBlock, event.blockNumber);
            }
            model.setNextBlock(toBlock + 1); // assuming toBlock is inclusive
            latestBlock = toBlock;
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
