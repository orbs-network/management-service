/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'ava';
import { BlocksTimeModel } from './block-time-model';

export default function approximatelyEqual(a: number, b: number, error = 0) {
    return Math.abs(a - b) - error < 0.0000001;
}

test('getExactBlockTime uses cache', async (t) => {
    const model = new BlocksTimeModel((blockNumber: number) => {
        t.fail(`should not poll (${blockNumber})`);
        throw new Error('should not poll');
    });
    // set cached results for 1st and last blocks in span
    (model as any).exactBlocksTime.set(42, 253);

    t.deepEqual(await model.getExactBlockTime(42, 1000), 253);
});

test('getExactBlockTime returns -1 on post-finality blocks', async (t) => {
    t.plan(1);
    const model = new BlocksTimeModel((_: number): Promise<number | null> => Promise.resolve(253));
    t.deepEqual(await model.getExactBlockTime(42, 252), -1); // #1
});

test('getExactBlockTime polls and uses cache', async (t) => {
    t.plan(3); // assert exactly 3 assertions are made ( = only polling once)
    const model = new BlocksTimeModel(
        (blockNumber: number): Promise<number | null> => {
            t.deepEqual(blockNumber, 42); // #1
            return Promise.resolve(253);
        }
    );

    t.deepEqual(await model.getExactBlockTime(42, 1000), 253); // #2
    t.deepEqual(await model.getExactBlockTime(42, 1000), 253); // #3
});

test('getExactBlockTime does not cache post-finality blocks', async (t) => {
    t.plan(4); // assert exactly 3 assertions are made ( = poll twice)
    const model = new BlocksTimeModel(
        (blockNumber: number): Promise<number | null> => {
            t.deepEqual(blockNumber, 42); // #1, #3
            return Promise.resolve(253);
        }
    );

    t.deepEqual(await model.getExactBlockTime(42, 252), -1); // #2
    t.deepEqual(await model.getExactBlockTime(42, 1000), 253); // #4
});
