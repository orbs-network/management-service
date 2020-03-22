import test from 'ava';
import { isLegalServiceConfiguration } from './data-types';

test('accepts legal config', t => {
    t.true(
        isLegalServiceConfiguration({
            boyarLegacyBootstrap: 'https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json',
            pollIntervalSeconds: 0.1,
            EthereumNetwork: 'ganache'
        })
    );
});
