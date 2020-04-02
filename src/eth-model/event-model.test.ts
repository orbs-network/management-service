/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'ava';
import { EventModel } from './event-model';
import { EventData } from 'web3-eth-contract';

function fakeEvent(blockNumber: number, data: string): EventData {
    return { blockNumber, data } as any;
}
test('rememberEvent remembers events', (t) => {
    const model = new EventModel(0);
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(1, 'bar'), 30);
    const innerModel = (model as any).eventsPerBlock;
    t.deepEqual(innerModel, [
        { time: -1, blockNumber: -1, events: [] },
        {
            time: 10,
            blockNumber: 1,
            events: [fakeEvent(1, 'foo'), fakeEvent(1, 'bar')],
        },
        {
            time: 20,
            blockNumber: 2,
            events: [fakeEvent(2, 'foo2')],
        },
    ]);
});
