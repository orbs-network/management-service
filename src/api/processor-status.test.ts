import test from 'ava';
import { StateManager } from '../model/manager';
import { getServiceStatus } from './processor-status';
import { exampleConfig } from '../config.example';

test.serial('[integration] getServiceStatus responds', (t) => {
  const state = new StateManager();

  // process
  const res = getServiceStatus(state.getCurrentSnapshot(), exampleConfig);

  t.log('result:', JSON.stringify(res, null, 2));

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  t.assert(res.Error.length > 0);
  t.assert(res.Status.length > 0);
  t.assert(new Date(res.Timestamp).getTime() > 1400000000);
  t.deepEqual(res.Payload, {
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
