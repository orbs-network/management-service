import test from 'ava';
import { StateManager } from '../model/manager';
import { getServiceStatus } from './processor-status';
import { exampleConfig } from '../config.example';

test.serial('[integration] getServiceStatus responds', (t) => {
  const state = new StateManager();

  // process
  const res = getServiceStatus(state.getCurrentSnapshot(), exampleConfig);

  t.log('result:', JSON.stringify(res, null, 2));

  t.deepEqual(res, {
    CurrentRefTime: 0,
    CurrentCommittee: [],
    CurrentStandbys: [],
    CurrentImageVersions: { main: {}, canary: {} },
    CurrentVirtualChains: {},
    CurrentTopology: [],
    CurrentIp: {},
    ProtocolVersionEvents: { main: [], canary: [] },
    Config: exampleConfig,
  });
});
