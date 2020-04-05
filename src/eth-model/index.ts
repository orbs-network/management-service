import Web3 from 'web3';
import { ABI } from '../data-types';
import { errorString, toNumber } from '../utils';
import { EventModel } from './event-model';
import { BlocksTimeModel } from './block-time-model';
import { ServiceEthereumConfiguration, EthereumReader, getNewEthereumReader } from '../ethereum-reader';

/*
goal:
the model holds the last 24+ hours of events per block per vchain (+1 historic if empty)
infinitly per 24h
IPs need diferent model, just keeps latest per orbs address
*/

const pollSize = 1000;

export type EventPollParams = {
    eventName: string;
    abi: ABI;
    address: string;
    fromBlock: number;
};

export class EthereumModel {
    private events = new Map<string, { params: EventPollParams; model: EventModel }>();
    private blockTime: BlocksTimeModel;
    constructor(private reader: EthereumReader) {
        this.blockTime = new BlocksTimeModel((blockNumber: number) => this.reader.getRefTime(blockNumber), 100);
    }

    pollSync() {
        /*
        todo: generate requests and batch them ?
        var batch = new web3.BatchRequest();
        batch.add(web3.eth.getBalance.request('0x0000000000000000000000000000000000000000', 'latest', callback));
        batch.add(contract.methods.balance(address).call.request({from: '0x0000000000000000000000000000000000000000'}, callback2));
        batch.execute();
        */

        for (const { params, model } of this.events.values()) {
            // todo move into cache?
            const fromBlock = model.getNextBlock();
            const toBlock = fromBlock + pollSize;

            const web3Contract = new this.web3.eth.Contract(params.abi, params.address);

            // TODO pagination
            (async () => {
                const events = await this.reader.getPastEvents(params.eventName, { fromBlock, toBlock });
                for (const event of events) {
                    model.rememberEvent(event, await this.blockTime.getApproximateBlockTime(event.blockNumber));
                }
            })().catch((e) => {
                console.error(`failed reading blocks: ${errorString(e)}`);
            });
        }
    }
    addContract(params: EventPollParams) {
        this.events.set(params.eventName, { params, model: new EventModel(params.fromBlock) });
    }
}
