import test from 'ava';
import { StateManager } from './manager';
import { exampleConfig } from '../config.example';

test('manager returns current state', (t) => {
  const m = new StateManager(exampleConfig);
  m.applyNewTimeRef(1000, 100);
  t.is(m.getCurrentSnapshot().CurrentRefTime, 1000);
  t.is(m.getCurrentSnapshot().CurrentRefBlock, 100);
});

test('manager returns historic state and fails when out of bounds', (t) => {
  const m = new StateManager(exampleConfig);
  m.applyNewTimeRef(1000, 100);
  t.is(m.getHistoricSnapshot(0).CurrentRefTime, 1000);
  t.is(m.getHistoricSnapshot(500).CurrentRefTime, 1000);
  t.is(m.getHistoricSnapshot(1000).CurrentRefTime, 1000);
  t.throws(() => {
    m.getHistoricSnapshot(1001);
  });
});
