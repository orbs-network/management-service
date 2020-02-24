import test from 'ava';
import { dockerComposeTool, getAddressForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { join } from 'path';
import { retry } from 'ts-retry-promise';
import { exec as cb_exec } from 'child_process';
import * as util from 'util';
const exec = util.promisify(cb_exec);
const pathToCompose = join(__dirname, 'docker-compose.yml');

const envName = dockerComposeTool(
    test.serial.before.bind(test.serial),
    test.serial.after.always.bind(test.serial.after),
    pathToCompose,
    {
        shouldPullImages: false
    }
);

async function serviceFetch(envName: string, pathToCompose: string) {
    console.log((await exec(`docker ps`)).stdout);
    const containerName = (
        await exec(`docker-compose  -p ${envName} -f "${pathToCompose}" ps app | awk '{print $1}' | tail -n 1`)
    ).stdout.trim();
    console.log('containerName', containerName);
    const resStr = (
        await exec(
            `docker run --network container:${containerName} appropriate/curl  -s --retry 10 --retry-delay 1 --retry-connrefused http://localhost:80`
        )
    ).stdout;
    console.log('resStr', resStr);
    const res = JSON.parse(resStr);
    return res;
}

async function localFetch(envName: string, pathToCompose: string) {
    const addr = await getAddressForService(envName, pathToCompose, 'app', 80);
    console.log('addr', addr);
    const res = await (await retry(() => fetch('http://' + addr), { retries: 10, delay: 300 })).json();
    return res;
}

test('happy flow', async t => {
    try {
        const res = await serviceFetch(envName, pathToCompose); // localFetch(envName, pathToCompose)
        t.deepEqual(res, { message: 'hello world' });
    } catch (err) {
        console.error(err);
        throw err;
    }
});
