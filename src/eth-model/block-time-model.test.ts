/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'ava';
import { BlocksTimeModel } from './block-time-model';
import Web3 from 'web3';
import { toNumber } from '../utils';

export default function approximatelyEqual(a: number, b: number, error = 0) {
    return Math.abs(a - b) - error < 0.0000001;
}

test('getApproximateBlockTime averages time of blocks in span', async (t) => {
    const model = new BlocksTimeModel((blockNumber: number) => {
        t.fail(`should not poll (${blockNumber}) if edges of blocks range are in cache`);
        throw new Error('should not poll');
    }, 10);
    // set cached results for 1st and last blocks in span
    (model as any).exactBlocksTime.set(40, 0);
    (model as any).exactBlocksTime.set(50, 1000);
    for (let i = 0; i <= 10; i++) {
        t.deepEqual(await model.getApproximateBlockTime(40 + i), i * 100);
    }
});

test('getApproximateBlockTime on edge case: block in last (unfinished) span polled manually', async (t) => {
    const model = new BlocksTimeModel((blockNumber: number): Promise<number | null> => {
        switch (blockNumber) {
            case 40:
                return Promise.resolve(0);
            case 42:
                return Promise.resolve(253);
            default:
                return Promise.resolve(null);
        }
    }, 10);
    const result = await model.getApproximateBlockTime(42);

    t.deepEqual(result, 253);
});

test('[web3 integration] block in last (unfinished) span polled manually', async (t) => {
    const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
    const model = new BlocksTimeModel(
        (blockNumber: number) => web3.eth.getBlock(blockNumber).then((b) => b && toNumber(b.timestamp)),
        10000
    );
    const latest = await web3.eth.getBlock('latest');
    const result = await model.getApproximateBlockTime(latest.number);

    t.assert(result == latest.timestamp, `result:${result} latest.timestamp:${latest.timestamp}`);
});

test('getExactBlockTime uses cache', async (t) => {
    const model = new BlocksTimeModel((blockNumber: number) => {
        t.fail(`should not poll (${blockNumber})`);
        throw new Error('should not poll');
    }, 10);
    // set cached results for 1st and last blocks in span
    (model as any).exactBlocksTime.set(42, 253);

    t.deepEqual(await model.getExactBlockTime(42), 253);
});

test('getExactBlockTime polls and uses cache', async (t) => {
    t.plan(3); // assert exactly 3 assertions are made ( = only polling once)
    const model = new BlocksTimeModel((blockNumber: number): Promise<number | null> => {
        t.pass(); // #1
        switch (blockNumber) {
            case 42:
                return Promise.resolve(253);
            default:
                return Promise.resolve(null);
        }
    }, 10);

    t.deepEqual(await model.getExactBlockTime(42), 253); // #2
    t.deepEqual(await model.getExactBlockTime(42), 253); // #3
});
