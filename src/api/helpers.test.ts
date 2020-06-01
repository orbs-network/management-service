import test from 'ava';
import { range } from '../helpers';
import { getVirtualChainPort } from './helpers';

test('two ids with 1-2 character diff dont get the same port (1000000s scenario)', (t) => {
    const ports = range(100).map((i) => getVirtualChainPort(`${i + 1000000}`));
    t.deepEqual(new Set(ports).size, ports.length, 'same amount of ports after de-dup');
});

test('two ids with 1-2 character diff dont get the same port (small numbers scenario)', (t) => {
    const ports = range(100).map((i) => getVirtualChainPort('' + i));
    t.deepEqual(new Set(ports).size, ports.length, 'same amount of ports after de-dup');
});
