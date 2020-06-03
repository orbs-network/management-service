import test from 'ava';
import { getIpFromHex } from './helpers';

test('getIpFromHex works', (t) => {
  t.is(getIpFromHex('0x01010101'), '1.1.1.1');
  t.is(getIpFromHex('0x01020304'), '1.2.3.4');
  t.is(getIpFromHex('0xffffffff'), '255.255.255.255');
});
