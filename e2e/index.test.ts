import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
const pathToCompose = join(__dirname, 'docker-compose.yml');

const env = new TestEnvironment(pathToCompose);

env.init();

test.serial('happy flow', async t => {
    const res = await env.fetch('app');
    t.deepEqual(res, { message: 'hello world' });
});
