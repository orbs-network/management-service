import test from 'ava';
import { StateManager } from '../model/manager';
import { renderServiceStatus } from './render-status';
import { exampleConfig } from '../config.example';

test.serial('[integration] getServiceStatus responds', (t) => {
  const state = new StateManager(exampleConfig);

  // process
  const res = renderServiceStatus(state.getCurrentSnapshot(), exampleConfig);

  t.log('result:', JSON.stringify(res, null, 2));

  t.assert(res.Error.length > 0);
  t.assert(res.Status.length > 0);
  t.assert(new Date(res.Timestamp).getTime() > 1400000000);
  t.deepEqual(res.Payload, {
    Uptime: 0,
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    CurrentCommittee: [],
    CurrentCandidates: [],
    CurrentTopology: [],
    CurrentImageVersions: { main: {}, canary: {} },
    CurrentImageVersionsUpdater: { main: {}, canary: {} },
    CurrentVirtualChains: {},
    ProtocolVersionEvents: { main: [], canary: [] },
    Guardians: {},
    Config: exampleConfig,
  });
});
