/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'ava';
import { EventModel, Timed } from './event-model';
import { EventData } from 'web3-eth-contract';

function timed<T>(time: number, obj: T): T & Timed {
    return { time, ...obj };
}
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
            events: [timed(10, fakeEvent(1, 'foo')), timed(30, fakeEvent(1, 'bar'))],
        },
        {
            time: 20,
            blockNumber: 2,
            events: [timed(20, fakeEvent(2, 'foo2'))],
        },
    ]);
});

test('getEvents on empty range', (t) => {
    const model = new EventModel();
    const events = model.getEvents(0, 100);
    t.deepEqual(events, []);
});

test('getEvents after range', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    const events = model.getEvents(40, 100);
    t.deepEqual(events, [timed(30, fakeEvent(3, 'bar'))]);
});

test('getEvents on middle range', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    const events = model.getEvents(15, 100);
    t.deepEqual(events, [timed(20, fakeEvent(2, 'foo2')), timed(30, fakeEvent(3, 'bar'))]);
});

test('getEvents on exact block time', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    const events = model.getEvents(30, 100);
    t.deepEqual(events, [timed(30, fakeEvent(3, 'bar'))]);
});

test('getEvents aggregates', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'foo2'), 20);
    model.rememberEvent(fakeEvent(2, 'foo3'), 20);
    model.rememberEvent(fakeEvent(3, 'bar'), 30);
    model.rememberEvent(fakeEvent(3, 'bar2'), 30);
    const events = model.getEvents(15, 100);
    t.deepEqual(events, [
        timed(20, fakeEvent(2, 'foo2')),
        timed(20, fakeEvent(2, 'foo3')),
        timed(30, fakeEvent(3, 'bar')),
        timed(30, fakeEvent(3, 'bar2')),
    ]);
});

test('getEvents 2 arguments : [from, event, to]', (t) => {
    const model = new EventModel();
    const from = 5;
    const to = 15;
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    const events = model.getEvents(from, to);
    t.deepEqual(events, [timed(10, fakeEvent(1, 'foo'))]);
});

test('getEvents 2 arguments : [event, from, to]', (t) => {
    const model = new EventModel();
    const from = 15;
    const to = 16;
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    const events = model.getEvents(from, to);
    t.deepEqual(events, [timed(10, fakeEvent(1, 'foo'))]);
});

test('getIndexOfBlocksNearTime of a time between two blocks', (t) => {
    const model = new EventModel();
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'bar'), 20);
    t.deepEqual(model.getIndexOfBlocksNearTime(15), { next: 2, prev: 1 });
});

test('getEvents 2 arguments : [event, from, to, event]', (t) => {
    const model = new EventModel();
    const from = 15;
    const to = 16;
    model.rememberEvent(fakeEvent(1, 'foo'), 10);
    model.rememberEvent(fakeEvent(2, 'bar'), 20);
    const events = model.getEvents(from, to);
    t.deepEqual(events, [timed(10, fakeEvent(1, 'foo'))]);
});
