import test from 'ava';
import { range } from './utils';
import { getVirtualChainPort as getVirtualChainGossipPort } from './ports';

test("two ids with 1-2 character diff dont get the same port (1000000's scenario)", (t) => {
    const ports = range(100).map((i) => getVirtualChainGossipPort(`${i + 1000000}`));
    t.deepEqual(new Set(ports).size, ports.length, 'same amount of ports after de-dup');
});

test('two ids with 1-2 character diff dont get the same port (small numbers scenario)', (t) => {
    const ports = range(100).map((i) => getVirtualChainGossipPort('' + i));
    t.deepEqual(new Set(ports).size, ports.length, 'same amount of ports after de-dup');
});
