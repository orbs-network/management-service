import test from 'ava';
import { StateManager } from '../model/manager';
import { renderServiceStatus } from './render-status';
import { exampleConfig } from '../config.example';
import { DailyStatsData } from '../helpers';

test.serial('[integration] getServiceStatus responds', (t) => {
  const state = new StateManager(exampleConfig);
  const stats: DailyStatsData = [];

  // process
  const res = renderServiceStatus(state.getCurrentSnapshot(), stats, exampleConfig);

  t.log('result:', JSON.stringify(res, null, 2));

  t.assert(res.Error.length > 0);
  t.assert(res.Status.length > 0);
  t.assert(new Date(res.Timestamp).getTime() > 1400000000);
  t.deepEqual(res.Payload, {
    Uptime: res.Payload.Uptime,
    MemoryBytesUsed: res.Payload.MemoryBytesUsed,
    Version: {
      Semantic: '',
    },
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    CurrentCommittee: [],
    CurrentCandidates: [],
    CurrentTopology: [],
    CurrentImageVersions: { main: {}, canary: {} },
    CurrentImageVersionsUpdater: { main: {}, canary: {} },
    CurrentVirtualChains: {},
    ProtocolVersionEvents: { main: [], canary: [] },
    CurrentContractAddress: {
      contractRegistry: exampleConfig.EthereumGenesisContract,
    },
    ContractAddressChanges: [],
    Guardians: {},
    EthereumRequestStats: [],
    CommitteeEvents: [],
    Config: exampleConfig,
  });
});
