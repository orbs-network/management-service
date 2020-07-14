import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from '../driver';
import { day, sleep, year } from '../../src/helpers';
import { deepDataMatcher } from '../deep-matcher';
import { expectationNodeManagement } from './expectations-node';
import { expectationStatus } from './expectations-status';

let stateReadyBlockTime = 0;
const driver = new TestEnvironment(join(__dirname, '../docker-compose.yml'));
driver.launchServices(true);

test.serial.before(async (t) => {
  t.log('[E2E] Bootstrap: set up ethereum state');
  t.timeout(60 * 1000);
  await driver.ethereum.setupInitialCommittee();
  await driver.ethereum.addVchain(30 * day, 'main');
  await driver.ethereum.addVchain(30 * day, 'canary');
  await driver.ethereum.upgradeProtocolVersion(17, 60 * day, 'main');
  await driver.ethereum.increaseTime(40 * day);
  await driver.ethereum.extendVchain('1000000', 90 * day);
  await driver.ethereum.upgradeProtocolVersion(19, 2 * day, 'main');
  await driver.ethereum.upgradeProtocolVersion(20, 2 * day, 'canary');
  await driver.ethereum.addVchain(90 * day, 'main');
  await driver.ethereum.increaseTime(10 * day);
  await driver.ethereum.increaseBlocks(1);
  stateReadyBlockTime = await driver.ethereum.getCurrentBlockTime();
  await driver.ethereum.increaseBlocks(driver.getAppConfig(true).FinalityBufferBlocks);
  t.log('[E2E] set up ethereum state done, block time:', stateReadyBlockTime);
});

test.serial('[E2E] Bootstrap: serves /node/management as expected', async (t) => {
  t.log('started');
  driver.testLogger = t.log;
  t.timeout(60 * 1000);

  t.log('fetching node/management');
  let res = await driver.fetch('app', 8080, 'node/management');
  while (!res || isErrorResponse(res) || !res.services?.['management-service']) {
    await sleep(1000);
    t.log('fetching node/management again, since last response:', res);
    res = await driver.fetch('app', 8080, 'node/management');
  }

  t.log('[E2E] result:', JSON.stringify(res, null, 2));

  const errors = deepDataMatcher(res, expectationNodeManagement);
  t.deepEqual(errors, []);
});

test.serial('[E2E] Bootstrap: serves /status as expected', async (t) => {
  t.log('started');
  driver.testLogger = t.log;

  t.log('fetching status');
  const res = await driver.fetch('app', 8080, `status`);

  t.log('[E2E] result:', JSON.stringify(res, null, 2));

  const errors = deepDataMatcher(res, expectationStatus);
  t.deepEqual(errors, []);
});

function isErrorResponse(res: any): res is { error: string; stack?: string | undefined; status: 'error' } {
  return res && res.status === 'error';
}
