import test from 'ava';
import { exec as cb_exec } from 'child_process';
import { dockerComposeTool, getAddressForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { retry } from 'ts-retry-promise';
import { promisify } from 'util';
const exec = promisify(cb_exec);

export class TestEnvironment {
    private envName: string = '';
    constructor(private pathToCompose: string) {}

    init() {
        this.envName = dockerComposeTool(
            test.serial.before.bind(test.serial),
            test.serial.after.always.bind(test.serial.after),
            this.pathToCompose,
            {
                shouldPullImages: false
            }
        );
    }

    async fetch(serviceName: string, port: number = 8080, path: string = '/') {
        // if (process.env['CIRCLECI']) {
        // return await retry(
        //     async () => {
        //         const { stdout } = await exec(
        //             `docker run --network container:${this.envName}_${serviceName}_1 appropriate/curl  -s --retry 10 --retry-delay 1 --retry-connrefused http://localhost:${port}${path}`
        //         );
        //         return JSON.parse(stdout);
        //     },
        //     { retries: 10, delay: 300 }
        // );
        // } else {
        const addr = await getAddressForService(this.envName, this.pathToCompose, serviceName, port);
        const res = await retry(() => fetch('http://' + addr + path), { retries: 10, delay: 300 });
        return res.json();
        // }
    }
}
