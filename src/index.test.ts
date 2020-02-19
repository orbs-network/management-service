import test from 'ava';
import { hello } from './index';

test('happy flow', t => {
    t.deepEqual(hello('world'), { message: 'hello world' });
});
