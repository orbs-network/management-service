import test from 'ava';
import { StateManager } from '../model/manager';
import { getParticipation, renderServiceStatus, renderServiceStatusAnalytics } from './render-status';
import { exampleConfig } from '../config.example';
import { DailyStatsData } from '../helpers';
import { State } from '../model/state';

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
    MemoryUsage: res.Payload.MemoryUsage,
    Version: {
      Semantic: '',
    },
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    EventsStats: {
      LastUpdateBlock: 0,
      TotalEventsProcessed: 0,
      EventCount: [],
    },
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
    Participation30Days: {},
    Config: exampleConfig,
  });
});

test.serial('[integration] getServiceStatusAnalytics responds', (t) => {
  const state = new StateManager(exampleConfig);
  const stats: DailyStatsData = [];

  // process
  const res = renderServiceStatusAnalytics(state.getCurrentSnapshot(), stats, exampleConfig);

  t.log('result:', JSON.stringify(res, null, 2));

  t.assert(res.Error.length > 0);
  t.assert(res.Status.length > 0);
  t.assert(new Date(res.Timestamp).getTime() > 1400000000);
  t.deepEqual(res.Payload, {
    Uptime: res.Payload.Uptime,
    MemoryUsage: res.Payload.MemoryUsage,
    Version: {
      Semantic: '',
    },
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    EventsStats: {
      LastUpdateBlock: 0,
      TotalEventsProcessed: 0,
      EventCount: [],
    },
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
    Participation30Days: {},
    CommitteeEvents: [],
    Config: exampleConfig,
  });
});

test.serial('[integration] getParticipation responds', (t) => {
  const state = new State(exampleConfig);
  let block = 99;
  state.applyNewTimeRef(500, block++);

  const resOnEmptyCommittee = getParticipation(state.getSnapshot(), 40);
  t.deepEqual(resOnEmptyCommittee, {});

  CommitteeChange(state, 1000, 'a', true);
  state.applyNewTimeRef(1000, block++);

  CommitteeChange(state, 1010, 'b', true);
  state.applyNewTimeRef(1010, block++);

  CommitteeChange(state, 1019, 'c', true);
  state.applyNewTimeRef(1019, block++);

  state.applyNewTimeRef(1020, block++);

  // process
  const res1 = getParticipation(state.getSnapshot(), 40);

  t.log('res1:', JSON.stringify(res1, null, 2));
  t.deepEqual(res1, {
    a: 20 / 40,
    b: 10 / 40,
    c: 1 / 40,
  });

  const res2 = getParticipation(state.getSnapshot(), 20);

  t.log('res2:', JSON.stringify(res2, null, 2));
  t.deepEqual(res2, {
    a: 20 / 20,
    b: 10 / 20,
    c: 1 / 20,
  });

  const res3 = getParticipation(state.getSnapshot(), 15);

  t.log('res3:', JSON.stringify(res3, null, 2));
  t.deepEqual(res3, {
    a: 1, // we were in before the period started
    b: 10 / 15,
    c: 1 / 15,
  });

  // one leaves
  CommitteeChange(state, 1020, 'a', false);
  state.applyNewTimeRef(1020, block++);

  //
  state.applyNewTimeRef(1026, block++);
  const res4 = getParticipation(state.getSnapshot(), 40);
  t.log('res4:', JSON.stringify(res4, null, 2));
  t.deepEqual(res4, {
    a: 20 / 40, // in: 1000-1019 ==> 20
    b: 16 / 40, // in: 1010-1025 ==> 16
    c: 7 / 40, // in: 1019-1025 ==> 7
  });

  // one returns after 10 seconds
  CommitteeChange(state, 1029, 'a', true);
  state.applyNewTimeRef(1029, block++);

  // ten more seconds pass without change
  state.applyNewTimeRef(1040, block++);

  const res5 = getParticipation(state.getSnapshot(), 40);

  t.log('res5:', JSON.stringify(res5, null, 2));
  t.deepEqual(res5, {
    a: 31 / 40, // in: 1000-1019, 1029-1039 ==> 20+11=31
    b: 30 / 40, // in: 1010-1039 ==> 30
    c: 21 / 40, // in: 1019-1039 ==> 21
  });

  CommitteeChange(state, 1050, 'a', false);
  CommitteeChange(state, 1050, 'b', false);
  CommitteeChange(state, 1050, 'c', false);
  state.applyNewTimeRef(1050, block++);

  CommitteeChange(state, 1059, 'a', true);
  state.applyNewTimeRef(1059, block++);

  CommitteeChange(state, 1060, 'a', false);
  CommitteeChange(state, 1060, 'a', true);
  CommitteeChange(state, 1060, 'a', false);
  CommitteeChange(state, 1060, 'a', true);
  state.applyNewTimeRef(1060, block++);
  state.applyNewTimeRef(1061, block++);
  const res6 = getParticipation(state.getSnapshot(), 10);
  t.log('res6:', JSON.stringify(res5, null, 2));
  t.deepEqual(res6, {
    a: 2 / 10, // count 1060 only once
  });
});

function CommitteeChange(s: State, time: number, addr: string, inCommittee: boolean) {
  s.applyNewCommitteeChange(time, {
    ...eventBase,
    returnValues: {
      addr,
      weight: '10000000000000000000000',
      certification: false,
      inCommittee,
    },
  });
}

const eventBase = {
  returnValues: {},
  raw: { data: '', topics: [] },
  event: '',
  signature: '',
  logIndex: 1,
  transactionIndex: 1,
  transactionHash: '',
  blockHash: '',
  blockNumber: 1,
  address: '',
};
