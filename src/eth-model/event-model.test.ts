/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'ava';
import { EventModel } from './event-model';
import { EventData } from 'web3-eth-contract';

function fakeEvent(blockNumber: number, data: string): EventData {
    return { blockNumber, returnValues: { data } } as any;
}
test('rememberEvent remembers events', (t) => {
    const model = new EventModel();
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

test('getEvents on empty range', (t) => {
    const model = new EventModel();
    const events = model.getEvents(0);
    t.deepEqual(events, []);
});

test('getEvents after range', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    const events = model.getEvents(40);
    t.deepEqual(events, [fakeEvent(3, 'bar')]);
});

test('getEvents on middle range', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    const events = model.getEvents(15);
    t.deepEqual(events, [fakeEvent(2, 'foo2'), fakeEvent(3, 'bar')]);
});

test('getEvents on exact block time', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    const events = model.getEvents(30);
    t.deepEqual(events, [fakeEvent(3, 'bar')]);
});

test('getEvents aggregates', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(2, 'foo3'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    model.rememberEvent(fakeEvent(3, 'bar2'), 30);
    const events = model.getEvents(15);
    t.deepEqual(events, [fakeEvent(2, 'foo2'), fakeEvent(2, 'foo3'), fakeEvent(3, 'bar'), fakeEvent(3, 'bar2')]);
});
