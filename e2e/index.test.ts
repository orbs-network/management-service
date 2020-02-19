import test from 'ava';
import { hello } from '../src/index';
import { dockerComposeTool, getAddressForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { join } from 'path';

const pathToCompose = join(__dirname, 'docker-compose.yml');

const envName = dockerComposeTool(
    test.serial.before.bind(test.serial),
    test.serial.after.always.bind(test.serial.after),
    pathToCompose,
    {
        shouldPullImages: false
    }
);

test('happy flow', async t => {
    const addr = await getAddressForService(envName, pathToCompose, 'app', 80);

    console.log('addr', addr);

    const res = await fetch('http://' + addr);

    t.deepEqual(await res.json(), { message: 'hello world' });
});
