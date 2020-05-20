import test, { ExecutionContext } from 'ava';
import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import { dockerComposeTool, getAddressForService, getLogsForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { retry } from 'ts-retry-promise';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';

export class TestEnvironment {
    private envName: string = '';
    public contractsDriver: Driver;
    constructor(private pathToCompose: string) {}

    getAppConfig() {
        return {
            Port: 8080,
            EthereumGenesisContract: this.contractsDriver.contractRegistry.address,
            FirstBlock: 0,
            EthereumEndpoint: `http://ganache:7545`, // host.docker.internal :(
            boyarLegacyBootstrap: 'http://static:80/legacy-boyar.json',
            pollIntervalSeconds: 1,
            finalityBufferTime: 0,
            finalityBufferBlocks: 0,
        };
    }
    init() {
        this.envName = dockerComposeTool(
            test.serial.before.bind(test.serial),
            test.serial.after.always.bind(test.serial.after),
            this.pathToCompose,
            {
                startOnlyTheseServices: ['ganache', 'static'],
                containerCleanUp: false,
            } as any
        );
        test.serial.before(
            'wait 5 seconds for ganache to warm up',
            () => new Promise((res) => setTimeout(res, 5 * 1000))
        );
        test.serial.before('start contracts driver', async (t) => {
            t.timeout(60 * 1000);
            const ganacheAddress = await getAddressForService(this.envName, this.pathToCompose, 'ganache', 7545);
            this.contractsDriver = await Driver.new({
                web3Provider: () => {
                    return new Web3(
                        new (HDWalletProvider as any)(
                            'vanish junk genuine web seminar cook absurd royal ability series taste method identify elevator liquid',
                            `http://localhost:${ganacheAddress.split(':')[1]}`,
                            0,
                            100,
                            false
                        )
                    );
                },
            });
        });
        test.serial.before('write management service config file', async (t) => {
            const configFilePath = join(__dirname, 'app-config.json');
            // clean up old config file
            try {
                unlinkSync(configFilePath);
            } catch (err) {}
            // prepare file
            writeFileSync(configFilePath, JSON.stringify(this.getAppConfig()));
        });
        test.serial.afterEach.always('print logs on failures', async (t: ExecutionContext & { passed: boolean }) => {
            if (!t.passed) {
                const logs = await getLogsForService(this.envName, this.pathToCompose, 'app');
                console.log(logs);
            }
        });

        dockerComposeTool(
            test.serial.before.bind(test.serial),
            test.serial.after.always.bind(test.serial.after),
            this.pathToCompose,
            {
                envName: this.envName,
                startOnlyTheseServices: ['app'],
                shouldPullImages: false,
                cleanUp: false,
                // containerCleanUp: false
            } as any
        );
    }

    async fetch(serviceName: string, port: number, path: string) {
        const addr = await getAddressForService(this.envName, this.pathToCompose, serviceName, port);
        return await retry(
            async () => {
                const response = await fetch(`http://${addr}/${path}`);
                const body = await response.text();
                try {
                    return JSON.parse(body);
                } catch (e) {
                    throw new Error(`invalid response: \n${body}`);
                }
            },
            { retries: 10, delay: 300 }
        );
    }
}
