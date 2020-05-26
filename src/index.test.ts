import { createVC, Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import test from 'ava';
import fetch from 'node-fetch';
import { retry } from 'ts-retry-promise';
import { serve } from '.';
import { NodeManagementConfigurationOutput, ServiceConfiguration } from './data-types';
import { nockBoyarConfig } from './test-kit';

test.serial('[small e2e] index serves /node/management with virtual chains', async (t) => {
    t.timeout(60 * 1000);
    const boyarConfigFakeEndpoint = nockBoyarConfig();

    const d = await Driver.new();
    const numnberOfVChains = 2;

    for (const _ of new Array(numnberOfVChains)) {
        await createVC(d);
    }

    const config: ServiceConfiguration = {
        Port: 1234,
        FirstBlock: 0,
        EthereumGenesisContract: d.contractRegistry.web3Contract.options.address,
        EthereumEndpoint: 'http://localhost:7545',
        boyarLegacyBootstrap: boyarConfigFakeEndpoint.congigUri + boyarConfigFakeEndpoint.configPath,
        pollIntervalSeconds: 0.1,
        finalityBufferBlocks: 0,
        DockerNamespace: 'orbsnetwork',
        verbose: true,
    };
    const server = serve(config);
    try {
        const response: NodeManagementConfigurationOutput = await retry(
            async () => {
                const response = await fetch(`http://localhost:${config.Port}/node/management`);
                const body = await response.text();
                try {
                    return JSON.parse(body);
                } catch (e) {
                    throw new Error(`invalid response: \n${body}`);
                }
            },
            { retries: 10, delay: 300 }
        );

        t.deepEqual(response.chains.length, numnberOfVChains, 'number of VChains');
    } finally {
        server.close();
    }
});
