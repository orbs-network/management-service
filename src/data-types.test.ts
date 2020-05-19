import test from 'ava';
import { isLegalServiceConfiguration } from './data-types';

test('accepts legal config', (t) => {
    t.true(
        isLegalServiceConfiguration({
            Port: 2,
            EthereumGenesisContract: 'foo',
            EthereumEndpoint: 'http://localhost:7545',
            boyarLegacyBootstrap: 'https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json',
            pollIntervalSeconds: 0.1,
            finalityBufferTime: 0,
            finalityBufferBlocks: 0,
        })
    );
});
