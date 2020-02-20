import test from 'ava';
import { dockerComposeTool, getAddressForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { join } from 'path';
import { retry } from 'ts-retry-promise';
const pathToCompose = join(__dirname, 'docker-compose.yml');

const envName = dockerComposeTool(
    test.serial.before.bind(test.serial),
    test.serial.after.always.bind(test.serial.after),
    pathToCompose,
    {
        shouldPullImages: false,
        healthCheck: {
            state: true,
            options: {
                custom: {
                    app: (addr: string) =>
                        fetch('http://' + addr).then(
                            _ => true,
                            _ => false
                        )
                }
            }
        }
    }
);

test('happy flow', async t => {
    const addr = await getAddressForService(envName, pathToCompose, 'app', 80);

    console.log('addr', addr);

    const res = await retry(() => fetch('http://' + addr), { retries: 10, delay: 300 });
    t.deepEqual(await res.json(), { message: 'hello world' });
});
