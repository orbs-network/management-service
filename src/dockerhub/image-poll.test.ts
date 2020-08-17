import test from 'ava';
import { ImagePoll } from './image-poll';
import { StateManager } from '../model/manager';
import { exampleConfig } from '../config.example';
import { sleep } from '../helpers';

test('getGradualRolloutDelay returns random values in window', (t) => {
  const iterations = 1000;
  const s = new StateManager(exampleConfig);
  const p = new ImagePoll(s, {
    ...exampleConfig,
    RegularRolloutWindowSeconds: 20000,
    HotfixRolloutWindowSeconds: 2000,
  });

  let sumRegular = 0;
  for (let i = 0; i < iterations; i++) {
    const delay = p.getGradualRolloutDelay('v1.2.3');
    t.assert(delay >= 0);
    t.assert(delay <= 20000);
    sumRegular += delay;
  }

  t.log(`average regular delay is ${sumRegular / iterations}`);
  t.assert(sumRegular / iterations > 2000);
  t.assert(sumRegular / iterations < 18000);

  let sumHotfix = 0;
  for (let i = 0; i < iterations; i++) {
    const delay = p.getGradualRolloutDelay('v1.2.3-hotfix');
    t.assert(delay >= 0);
    t.assert(delay <= 2000);
    sumHotfix += delay;
  }

  t.log(`average hotfix delay is ${sumHotfix / iterations}`);
  t.assert(sumHotfix / iterations > 200);
  t.assert(sumHotfix / iterations < 1800);
});

test('performImmediateUpdate does not downgrade', (t) => {
  const s = new StateManager(exampleConfig);
  const p = new ImagePoll(s, exampleConfig);

  p.performImmediateUpdate('main', 'node', 'v1.0.0');
  p.performImmediateUpdate('main', 'node', 'v1.0.0'); // if poll provides the same version
  p.performImmediateUpdate('main', 'node', 'v2.0.0');
  p.performImmediateUpdate('main', 'node', 'v1.8.0'); // downgrade not allowed
  p.performImmediateUpdate('canary', 'node', 'v5.0.0');
  p.performImmediateUpdate('canary', 'node', 'v6.0.0-4729843');
  p.performImmediateUpdate('main', 'management-service', 'v7.0.0');

  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v2.0.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['management-service'], 'v7.0.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersions['canary']['node'], 'v5.0.0');
});

test('performGradualRollout works as expected', async (t) => {
  const s = new StateManager(exampleConfig);
  const p = new ImagePoll(s, {
    ...exampleConfig,
    RegularRolloutWindowSeconds: 1000000,
    HotfixRolloutWindowSeconds: 2,
  });

  // just to initialize CurrentImageVersionsUpdater in state
  s.applyNewImageVersionPollTime(0, 'main', 'node');
  s.applyNewImageVersionPollTime(0, 'canary', 'node');

  p.performGradualRollout('main', 'node', 'v1.1.0');
  p.performGradualRollout('canary', 'node', 'v1.1.0-canary');
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v1.1.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersion, '');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersionTime == 0);
  t.is(s.getCurrentSnapshot().CurrentImageVersions['canary']['node'], 'v1.1.0-canary');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['canary']['node'].PendingVersion, '');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['canary']['node'].PendingVersionTime == 0);

  p.performGradualRollout('main', 'node', 'v1.1.0'); // if poll provides the same version
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v1.1.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersion, '');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersionTime == 0);

  p.performGradualRollout('main', 'node', 'v1.2.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v1.1.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersion, 'v1.2.0');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersionTime > 1400000000);

  p.performGradualRollout('main', 'node', 'v1.3.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v1.1.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersion, 'v1.3.0');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersionTime > 1400000000);

  p.performGradualRollout('main', 'node', 'v1.2.0'); // downgrade not allowed
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v1.1.0');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersion, 'v1.3.0');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersionTime > 1400000000);

  p.performGradualRollout('main', 'node', 'v1.4.0-hotfix');
  p.performGradualRollout('canary', 'node', 'v1.4.0-canary-hotfix');
  await sleep(3000);
  t.is(s.getCurrentSnapshot().CurrentImageVersions['main']['node'], 'v1.4.0-hotfix');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersion, '');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['main']['node'].PendingVersionTime == 0);
  t.is(s.getCurrentSnapshot().CurrentImageVersions['canary']['node'], 'v1.4.0-canary-hotfix');
  t.is(s.getCurrentSnapshot().CurrentImageVersionsUpdater['canary']['node'].PendingVersion, '');
  t.assert(s.getCurrentSnapshot().CurrentImageVersionsUpdater['canary']['node'].PendingVersionTime == 0);
});
