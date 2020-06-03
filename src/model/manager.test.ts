import test from 'ava';
import { StateManager } from './manager';

test('manager returns current state', (t) => {
  const m = new StateManager();
  m.applyNewTimeRef(1000);
  t.is(m.getCurrentSnapshot().CurrentRefTime, 1000);
});

test('manager returns historic state and fails when out of bounds', (t) => {
  const m = new StateManager();
  m.applyNewTimeRef(1000);
  t.is(m.getHistoricSnapshot(0).CurrentRefTime, 1000);
  t.is(m.getHistoricSnapshot(500).CurrentRefTime, 1000);
  t.is(m.getHistoricSnapshot(1000).CurrentRefTime, 1000);
  t.throws(() => {
    m.getHistoricSnapshot(1001);
  });
});
