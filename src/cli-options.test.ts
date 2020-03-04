import test from 'ava';
import { parseOptions } from './cli-options';
import mock from 'mock-fs';

test.serial.afterEach.always(() => {
    mock.restore();
});

const configPath = 'some/path/config.json';
const configValue = { boyarLegacyBootstrap: 'https://foo.com./bar/baz' };

test.serial('parseOptions with file', t => {
    mock({
        [configPath]: JSON.stringify(configValue)
    });

    t.deepEqual(parseOptions(['--config', configPath]), configValue);
});

test.serial('parseOptions with no file', t => {
    t.throws(() => parseOptions(['--config', configPath]));
});

test.serial('parseOptions with no config', t => {
    t.throws(() => parseOptions([]));
});
