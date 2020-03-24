import test from 'ava';
import { parseOptions } from './cli-options';
import mock from 'mock-fs';
import { ServiceConfiguration } from './data-types';

test.serial.afterEach.always(() => {
    mock.restore();
});

const configPath = 'some/path/config.json';

const minimalConfigValue = {
    EthereumGenesisContract: 'bar',
    EthereumEndpoint: 'http://localhost:7545',
    boyarLegacyBootstrap: 'foo',
};
const configValue: ServiceConfiguration = {
    ...minimalConfigValue,
    Port: -1,
    pollIntervalSeconds: 0.5,
};

test.serial('parseOptions with file', (t) => {
    mock({
        [configPath]: JSON.stringify(configValue),
    });

    t.deepEqual(parseOptions(['--config', configPath]), configValue);
});

test.serial('parseOptions with partial file (complete default values)', (t) => {
    mock({
        [configPath]: JSON.stringify(minimalConfigValue),
    });

    t.deepEqual(parseOptions(['--config', configPath]), { ...minimalConfigValue, pollIntervalSeconds: 1, Port: 8080 });
});

test.serial('parseOptions with no file', (t) => {
    t.throws(() => parseOptions(['--config', configPath]));
});

test.serial('parseOptions with no config', (t) => {
    t.throws(() => parseOptions([]));
});
