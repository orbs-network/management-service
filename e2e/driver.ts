import test from 'ava';
import { exec as cb_exec } from 'child_process';
import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import { dockerComposeTool, getAddressForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { retry } from 'ts-retry-promise';
import { promisify } from 'util';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';

const exec = promisify(cb_exec);

export class TestEnvironment {
    private envName: string = '';
    public contractsDriver: Driver;
    constructor(private pathToCompose: string) { }

    getAppConfig() {
        return {
            Port: 8080,
            EthereumGenesisContract: this.contractsDriver.contractRegistry.address,
            EthereumEndpoint: 'http://host.docker.internal:7545',
            boyarLegacyBootstrap: 'http://static:80/legacy-boyar.json',
            pollIntervalSeconds: 1
        };
    }
    init() {
        test.serial.before(async _t => {
            // clean up old config file
            const configFilePath = join(__dirname, 'app-config.json');
            try {
                unlinkSync(configFilePath);
            } catch (err) { }
            // connect driver
            this.contractsDriver = await Driver.new();
            // prepare file
            writeFileSync(configFilePath, JSON.stringify(this.getAppConfig()));
        });
        this.envName = dockerComposeTool(
            test.serial.before.bind(test.serial),
            test.serial.after.always.bind(test.serial.after),
            this.pathToCompose,
            {
                shouldPullImages: false
                // containerCleanUp: false
            } as any
        );
    }

    async fetch(serviceName: string, port: number = 8080, path: string = '/') {
        const addr = await getAddressForService(this.envName, this.pathToCompose, serviceName, port);
        const res = await retry(() => fetch('http://' + addr + path), { retries: 10, delay: 300 });
        return res.json();
    }
}
