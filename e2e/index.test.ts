import test from 'ava';
import { join } from 'path';
import { TestEnvironment } from './driver';
import { day, sleep } from '../src/helpers';
import { deepDataMatcher } from './deep-matcher';
import { expectationNodeManagement } from './expectations-node';
import { expectationStatus } from './expectations-status';

let stateReadyBlockTime = 0;
const driver = new TestEnvironment(join(__dirname, 'docker-compose.yml'));
driver.launchServices(false);

test.serial.before(async (t) => {
  t.log('[E2E] set up ethereum state');
  t.timeout(60 * 1000);
  await driver.ethereum.setupInitialCommittee();
  await driver.ethereum.setGuardianMetadata(
    '0x02ebe4663d6110aec8f816f9772a4087cc1a5ec7',
    'REWARDS_FREQUENCY_SEC',
    '112233'
  );
  await driver.ethereum.increaseTime(10 * day);
  await driver.ethereum.increaseBlocks(1);
  stateReadyBlockTime = await driver.ethereum.getCurrentBlockTime();
  await driver.ethereum.increaseBlocks(driver.getAppConfig(false).FinalityBufferBlocks);
  t.log('[E2E] set up ethereum state done, block time:', stateReadyBlockTime);
});

test.serial('[E2E] serves /node/management as expected', async (t) => {
  t.log('started');
  driver.testLogger = t.log;
  t.timeout(60 * 1000);

  t.log('fetching node/management');
  let res = await driver.fetch('app', 8080, 'node/management');
  while (
    !res ||
    isErrorResponse(res) ||
    !res.chains ||
    res.chains.length < 3 ||
    !res.services?.['ethereum-writer'] ||
    !res.services?.['logs-service']
  ) {
    await sleep(1000);
    t.log('fetching node/management again, since last response:', res);
    res = await driver.fetch('app', 8080, 'node/management');
  }

  t.log('[E2E] result:', JSON.stringify(res, null, 2));

  const errors = deepDataMatcher(res, expectationNodeManagement);
  t.deepEqual(errors, []);
  t.truthy(res.orchestrator.ExecutableImage);
});

test.serial('[E2E] serves /status as expected', async (t) => {
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
