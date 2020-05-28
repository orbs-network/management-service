import { createVC, Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import test from 'ava';
import fetch from 'node-fetch';
import { retry } from 'ts-retry-promise';
import { serve } from '.';
import { NodeManagementConfigurationOutput, ServiceConfiguration } from './data-types';
import { nockBoyarConfig } from './test-kit';

test.serial('[small e2e] index serves /node/management with virtual chains', async (t) => {
    t.timeout(60 * 1000);
    let boyarConfigFakeEndpoint = nockBoyarConfig();

    const d = await Driver.new();
    const numnberOfVChains = 2;
    const firstBlock = await d.web3.eth.getBlockNumber();

    for (const _ of new Array(numnberOfVChains)) {
        await createVC(d);
    }

    const config: ServiceConfiguration = {
        Port: 1234,
        FirstBlock: firstBlock,
        EthereumGenesisContract: d.contractRegistry.web3Contract.options.address,
        EthereumEndpoint: 'http://localhost:7545',
        boyarLegacyBootstrap: boyarConfigFakeEndpoint.congigUri + boyarConfigFakeEndpoint.configPath,
        pollIntervalSeconds: 0.5,
        finalityBufferBlocks: 0,
        DockerNamespace: 'orbsnetwork',
        verbose: true,
    };
    const server = serve(config);

    await new Promise((res) => setTimeout(res, 5 * 1000));
    await d.newSubscriber('defaultTier', 0); // add a block for finality

    try {
        let response: NodeManagementConfigurationOutput = await retry(
            () => fetch(`http://localhost:${config.Port}/node/management`).then((r) => r.json()),
            { retries: 10, delay: 500 }
        );
        while (!response || !response.chains || response.chains.length < numnberOfVChains) {
            boyarConfigFakeEndpoint.scope.done();
            boyarConfigFakeEndpoint = nockBoyarConfig();
            await new Promise((res) => setTimeout(res, 100));
            response = await fetch(`http://localhost:${config.Port}/node/management`).then((r) => r.json());
        }
        t.pass();
    } finally {
        boyarConfigFakeEndpoint.scope.done();
        server.close();
    }
});
