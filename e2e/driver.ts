import test, { ExecutionContext } from 'ava';
import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import { dockerComposeTool, getAddressForService, getLogsForService } from 'docker-compose-mocha';
import fetch from 'node-fetch';
import { retry } from 'ts-retry-promise';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';
import { exec } from 'child_process';

export class TestEnvironment {
    private envName: string = '';
    public contractsDriver: Driver;
    public logger: (lines: string) => void;
    constructor(private pathToCompose: string) {}

    getAppConfig() {
        return {
            Port: 8080,
            EthereumGenesisContract: this.contractsDriver.contractRegistry.address,
            FirstBlock: 0,
            EthereumEndpoint: `http://ganache:7545`, // host.docker.internal :(
            boyarLegacyBootstrap: 'http://static:80/legacy-boyar.json',
            EthereumPollIntervalSeconds: 1,
            DockerHubPollIntervalSeconds: 1,
            FinalityBufferBlocks: 0,
            verbose: true,
        };
    }
    init() {
        test.serial.before('(log step)', async (t) => {
            console.log('e2e driver init() start');
            t.log('e2e driver init() start');
        });
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
            console.log('starting contracts driver');
            t.log('starting contracts driver');
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

            console.log('contracts driver initialized');
            t.log('contracts driver initialized');
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

        // old code to dump entire log of app at the end of test
        // let emittedLogLines = 0;
        // test.serial.afterEach.always('print app logs', async (t: ExecutionContext) => {
        //     const logs: string = await getLogsForService(this.envName, this.pathToCompose, 'app');
        //     const logLines = logs.split('\n').slice(emittedLogLines);
        //     emittedLogLines += logLines.length - 1;
        //     t.log(logLines.join('\n'));
        // });

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
        test.serial.before('(log step)', async (t) => {
            const logP = exec(`docker-compose -p ${this.envName} -f "${this.pathToCompose}" logs -f app`);
            this.logger = t.log;
            logP.stdout.on('data', (data) => {
                if (this.logger) {
                    this.logger(data);
                }
            });
            logP.on('exit', () => {
                if (this.logger) {
                    this.logger(`app log exited`);
                }
            });
            console.log('e2e driver init() done');
            t.log('e2e driver init() done');
        });
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
