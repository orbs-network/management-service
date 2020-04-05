import { errorString } from '../utils';
import { EventModel } from './event-model';
import { BlocksTimeModel } from './block-time-model';
import { EthereumReader, EventName, eventNames } from '../ethereum-reader';

/*
goal:
the model holds the last 24+ hours of events per block per vchain (+1 historic if empty)
infinitly per 24h
IPs need diferent model, just keeps latest per orbs address
*/

const pollSize = 1000;

export class EthereumModel {
    private events: { [n in EventName]: EventModel } = {
        CommitteeChanged: new EventModel(),
        TopologyChanged: new EventModel(),
        SubscriptionChanged: new EventModel(),
        ProtocolVersionChanged: new EventModel(),
    };
    // private events = new Map<EventName, EventModel>();
    private blockTime: BlocksTimeModel;
    constructor(private reader: EthereumReader) {
        this.blockTime = new BlocksTimeModel((blockNumber: number) => this.reader.getRefTime(blockNumber), 100);
    }

    async pollEvents() {
        const latestBlockNumber = await this.reader.getBlockNumber(); // TODO will throw on errors

        /*
        todo: generate requests and batch them ?
        var batch = new web3.BatchRequest();
        batch.add(web3.eth.getBalance.request('0x0000000000000000000000000000000000000000', 'latest', callback));
        batch.add(contract.methods.balance(address).call.request({from: '0x0000000000000000000000000000000000000000'}, callback2));
        batch.execute();
        */
        await Promise.all(eventNames.map((n) => this.pollEvent(n, latestBlockNumber)));
    }

    private async pollEvent(eventName: EventName, latestBlockNumber: number) {
        const model = this.events[eventName];
        // todo move into cache?
        const fromBlock = model.getNextBlock();
        const toBlock = Math.min(latestBlockNumber, fromBlock + pollSize);
        // TODO pagination
        try {
            const events = await this.reader.getPastEvents(eventName, { fromBlock, toBlock });
            for (const event of events) {
                const blockTime = await this.blockTime.getExactBlockTime(event.blockNumber);
                if (blockTime == null) {
                    throw new Error(`got null reading block ${blockTime}`);
                }
                model.rememberEvent(event, blockTime);
            }
            model.setNextBlock(toBlock + 1); // assuming toBlock is inclusive
        } catch (e) {
            console.error(`failed reading blocks: ${errorString(e)}`);
        }
    }

    getLast24HoursEvents(eventName: EventName, fromTime: number) {
        return this.events[eventName].getEvents(fromTime);
    }
}
