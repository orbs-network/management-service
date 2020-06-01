import test from 'ava';
import { parseOptions } from './cli-options';
import mock from 'mock-fs';
import { ServiceConfiguration, validateServiceConfiguration } from './data-types';

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
    FirstBlock: 0,
    EthereumPollIntervalSeconds: 0.5,
    DockerHubPollIntervalSeconds: 1,
    FinalityBufferBlocks: 0,
    DockerNamespace: 'foo',
    verbose: true,
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

    const options = parseOptions(['--config', configPath]);
    t.deepEqual(validateServiceConfiguration(options), undefined);
});

test.serial('parseOptions with no file', (t) => {
    t.throws(() => parseOptions(['--config', configPath]));
});

test.serial('parseOptions with no config', (t) => {
    t.throws(() => parseOptions([]));
});
