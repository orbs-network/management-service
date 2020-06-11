import test from 'ava';
import { State } from './state';
import { day } from '../helpers';

test('state applies time ref', (t) => {
  const s = new State();
  s.applyNewTimeRef(1000);
  t.is(s.getSnapshot().CurrentRefTime, 1000);
  t.is(s.getSnapshot().PageStartRefTime, 0);
  t.is(s.getSnapshot().PageEndRefTime, 1000);
});

test('state applies commitee, standby, IPs and topology', (t) => {
  const s = new State();

  ValidatorRegistered(s, 1000, '0xA', '0xa1', '0x01010101');
  ValidatorRegistered(s, 1000, '0xB', '0xb1', '0x02020202');
  ValidatorRegistered(s, 1000, '0xC', '0xc1', '0x03030303');
  ValidatorRegistered(s, 1000, '0xM', '0xm1', '0x04040404');
  ValidatorRegistered(s, 1000, '0xN', '0xn1', '0x05050505');
  CommitteeChanged(s, 1000, ['0xA', '0xB', '0xC'], ['0xa1', '0xb1', '0xc1']);
  StandbysChanged(s, 1000, ['0xM', '0xN'], ['0xm1', '0xn1']);
  s.applyNewTimeRef(1000);

  ValidatorRegistered(s, 2000, '0xZ', '0xz2', '0x06060606');
  ValidatorRegistered(s, 2000, '0xA', '0xa2', '0x07070707');
  ValidatorRegistered(s, 2000, '0xO', '0xo2', '0x08080808');
  CommitteeChanged(s, 2000, ['0xZ', '0xB', '0xC'], ['0xz2', '0xb2', '0xc2']);
  StandbysChanged(s, 2000, ['0xN', '0xO'], ['0xn2', '0xo2']);
  s.applyNewTimeRef(2000);

  ValidatorRegistered(s, day + 3000, '0xX', '0xx3', '0x09090909');
  ValidatorRegistered(s, day + 3000, '0xZ', '0xz3', '0x0a0a0a0a');
  ValidatorRegistered(s, day + 3000, '0xZ', '0xz3', '0x0b0b0b0b');
  ValidatorRegistered(s, day + 3000, '0xP', '0xp3', '0x0c0c0c0c');
  CommitteeChanged(s, day + 3000, ['0xX', '0xZ'], ['0xx3', '0xz3']);
  StandbysChanged(s, day + 3000, ['0xO', '0xP'], ['0xo3', '0xp3']);
  s.applyNewTimeRef(day + 3000);

  t.log(JSON.stringify(s.getSnapshot(), null, 2));

  t.is(s.getSnapshot().CurrentIp['a'], '7.7.7.7');
  t.is(s.getSnapshot().CurrentIp['b'], '2.2.2.2');
  t.is(s.getSnapshot().CurrentIp['c'], '3.3.3.3');
  t.is(s.getSnapshot().CurrentIp['m'], '4.4.4.4');
  t.is(s.getSnapshot().CurrentIp['n'], '5.5.5.5');
  t.is(s.getSnapshot().CurrentIp['z'], '11.11.11.11');
  t.is(s.getSnapshot().CurrentIp['o'], '8.8.8.8');
  t.is(s.getSnapshot().CurrentIp['x'], '9.9.9.9');
  t.is(s.getSnapshot().CurrentIp['p'], '12.12.12.12');

  t.deepEqual(s.getSnapshot().CurrentStandbys, [
    { EthAddress: 'o', OrbsAddress: 'o3' },
    { EthAddress: 'p', OrbsAddress: 'p3' },
  ]);

  t.is(s.getSnapshot().CommitteeEvents.length, 3);
  t.is(s.getSnapshot().CommitteeEvents[0].RefTime, 1000);
  t.deepEqual(s.getSnapshot().CommitteeEvents[0].Committee, [
    { EthAddress: 'a', OrbsAddress: 'a1', Weight: 10000, IdentityType: 0 },
    { EthAddress: 'b', OrbsAddress: 'b1', Weight: 10000, IdentityType: 0 },
    { EthAddress: 'c', OrbsAddress: 'c1', Weight: 10000, IdentityType: 0 },
  ]);
  t.is(s.getSnapshot().CommitteeEvents[1].RefTime, 2000);
  t.deepEqual(s.getSnapshot().CommitteeEvents[1].Committee, [
    { EthAddress: 'z', OrbsAddress: 'z2', Weight: 10000, IdentityType: 0 },
    { EthAddress: 'b', OrbsAddress: 'b2', Weight: 10000, IdentityType: 0 },
    { EthAddress: 'c', OrbsAddress: 'c2', Weight: 10000, IdentityType: 0 },
  ]);
  t.is(s.getSnapshot().CommitteeEvents[2].RefTime, day + 3000);
  t.deepEqual(s.getSnapshot().CommitteeEvents[2].Committee, [
    { EthAddress: 'x', OrbsAddress: 'x3', Weight: 10000, IdentityType: 0 },
    { EthAddress: 'z', OrbsAddress: 'z3', Weight: 10000, IdentityType: 0 },
  ]);

  t.deepEqual(s.getSnapshot().CurrentTopology, [
    { EthAddress: 'z', OrbsAddress: 'z3', Ip: '11.11.11.11', Port: 0 },
    { EthAddress: 'b', OrbsAddress: 'b2', Ip: '2.2.2.2', Port: 0 },
    { EthAddress: 'c', OrbsAddress: 'c2', Ip: '3.3.3.3', Port: 0 },
    { EthAddress: 'x', OrbsAddress: 'x3', Ip: '9.9.9.9', Port: 0 },
    { EthAddress: 'o', OrbsAddress: 'o3', Ip: '8.8.8.8', Port: 0 },
    { EthAddress: 'p', OrbsAddress: 'p3', Ip: '12.12.12.12', Port: 0 },
  ]);

  t.deepEqual(s.getSnapshot().CurrentCommittee, [
    { EthAddress: 'x', OrbsAddress: 'x3', Weight: 10000, IdentityType: 0 },
    { EthAddress: 'z', OrbsAddress: 'z3', Weight: 10000, IdentityType: 0 },
  ]);
});

test('state applies virtual chain subscriptions', (t) => {
  const s = new State();

  SubscriptionChanged(s, 1000, 'V1', 9010);
  s.applyNewTimeRef(1000);

  SubscriptionChanged(s, 2000, 'V2', 3500);
  SubscriptionChanged(s, 2000, 'V3', 3500);
  s.applyNewTimeRef(2000);

  SubscriptionChanged(s, 3000, 'V3', 9020);
  SubscriptionChanged(s, 3000, 'V4', 4500);
  SubscriptionChanged(s, 3000, 'V5', 3500);
  s.applyNewTimeRef(3000);

  SubscriptionChanged(s, 4000, 'V4', 4700);
  SubscriptionChanged(s, 4000, 'V5', 9030);
  s.applyNewTimeRef(4000);

  s.applyNewTimeRef(5000);

  t.log(JSON.stringify(s.getSnapshot(), null, 2));

  t.is(s.getSnapshot().CurrentVirtualChains['V1'].Expiration, 9010);
  t.is(s.getSnapshot().CurrentVirtualChains['V2'].Expiration, 3500);
  t.is(s.getSnapshot().CurrentVirtualChains['V3'].Expiration, 9020);
  t.is(s.getSnapshot().CurrentVirtualChains['V4'].Expiration, 4700);
  t.is(s.getSnapshot().CurrentVirtualChains['V5'].Expiration, 9030);

  t.is(s.getSnapshot().SubscriptionEvents['V1'].length, 2);
  t.is(s.getSnapshot().SubscriptionEvents['V1'][0].RefTime, 1000);
  t.is(s.getSnapshot().SubscriptionEvents['V1'][0].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V1'][1].RefTime, 9010);
  t.is(s.getSnapshot().SubscriptionEvents['V1'][1].Data.Status, 'expired');

  t.is(s.getSnapshot().SubscriptionEvents['V2'].length, 2);
  t.is(s.getSnapshot().SubscriptionEvents['V2'][0].RefTime, 2000);
  t.is(s.getSnapshot().SubscriptionEvents['V2'][0].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V2'][1].RefTime, 3500);
  t.is(s.getSnapshot().SubscriptionEvents['V2'][1].Data.Status, 'expired');

  t.is(s.getSnapshot().SubscriptionEvents['V3'].length, 3);
  t.is(s.getSnapshot().SubscriptionEvents['V3'][0].RefTime, 2000);
  t.is(s.getSnapshot().SubscriptionEvents['V3'][0].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V3'][1].RefTime, 3000);
  t.is(s.getSnapshot().SubscriptionEvents['V3'][1].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V3'][2].RefTime, 9020);
  t.is(s.getSnapshot().SubscriptionEvents['V3'][2].Data.Status, 'expired');

  t.is(s.getSnapshot().SubscriptionEvents['V4'].length, 3);
  t.is(s.getSnapshot().SubscriptionEvents['V4'][0].RefTime, 3000);
  t.is(s.getSnapshot().SubscriptionEvents['V4'][0].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V4'][1].RefTime, 4000);
  t.is(s.getSnapshot().SubscriptionEvents['V4'][1].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V4'][2].RefTime, 4700);
  t.is(s.getSnapshot().SubscriptionEvents['V4'][2].Data.Status, 'expired');

  t.is(s.getSnapshot().SubscriptionEvents['V5'].length, 4);
  t.is(s.getSnapshot().SubscriptionEvents['V5'][0].RefTime, 3000);
  t.is(s.getSnapshot().SubscriptionEvents['V5'][0].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V5'][1].RefTime, 3500);
  t.is(s.getSnapshot().SubscriptionEvents['V5'][1].Data.Status, 'expired');
  t.is(s.getSnapshot().SubscriptionEvents['V5'][2].RefTime, 4000);
  t.is(s.getSnapshot().SubscriptionEvents['V5'][2].Data.Status, 'active');
  t.is(s.getSnapshot().SubscriptionEvents['V5'][3].RefTime, 9030);
  t.is(s.getSnapshot().SubscriptionEvents['V5'][3].Data.Status, 'expired');

  t.deepEqual(s.getSnapshot().CurrentVirtualChains['V1'], {
    Expiration: 9010,
    RolloutGroup: 'main',
    IdentityType: 0,
    GenesisBlock: 123,
    Tier: 'defaultTier',
  });
  t.deepEqual(s.getSnapshot().CurrentVirtualChains['V2'], {
    Expiration: 3500,
    Tier: 'defaultTier',
    RolloutGroup: 'main',
    IdentityType: 0,
    GenesisBlock: 123,
  });
  t.deepEqual(s.getSnapshot().CurrentVirtualChains['V3'], {
    Expiration: 9020,
    Tier: 'defaultTier',
    RolloutGroup: 'main',
    IdentityType: 0,
    GenesisBlock: 123,
  });
  t.deepEqual(s.getSnapshot().CurrentVirtualChains['V4'], {
    Expiration: 4700,
    Tier: 'defaultTier',
    RolloutGroup: 'main',
    IdentityType: 0,
    GenesisBlock: 123,
  });
  t.deepEqual(s.getSnapshot().CurrentVirtualChains['V5'], {
    Expiration: 9030,
    Tier: 'defaultTier',
    RolloutGroup: 'main',
    IdentityType: 0,
    GenesisBlock: 123,
  });
});

test('state applies protocol version changes', (t) => {
  const s = new State();

  ProtocolVersionChanged(s, 1000, 5, 1500);
  s.applyNewTimeRef(1000);

  ProtocolVersionChanged(s, 2000, 6, 2500);
  s.applyNewTimeRef(2000);

  ProtocolVersionChanged(s, 3000, 7, 4500);
  s.applyNewTimeRef(3000);

  ProtocolVersionChanged(s, 4000, 8, 5500);
  s.applyNewTimeRef(4000);

  s.applyNewTimeRef(5000);

  t.log(JSON.stringify(s.getSnapshot(), null, 2));

  t.is(s.getSnapshot().ProtocolVersionEvents['main'].length, 3);
  t.is(s.getSnapshot().ProtocolVersionEvents['main'][0].RefTime, 1500);
  t.is(s.getSnapshot().ProtocolVersionEvents['main'][0].Data.Version, 5);
  t.is(s.getSnapshot().ProtocolVersionEvents['main'][1].RefTime, 2500);
  t.is(s.getSnapshot().ProtocolVersionEvents['main'][1].Data.Version, 6);
  t.is(s.getSnapshot().ProtocolVersionEvents['main'][2].RefTime, 5500);
  t.is(s.getSnapshot().ProtocolVersionEvents['main'][2].Data.Version, 8);
});

test('state applies image version changes', (t) => {
  const s = new State();

  s.applyNewImageVersionPollTime(1000, 'main', 'node');
  s.applyNewImageVersion('main', 'node', 'v1.0.0');
  s.applyNewImageVersionPollTime(2000, 'main', 'management-service');
  s.applyNewImageVersionPendingUpdate('canary', 'node', 'v9.9.1', 8000);
  s.applyNewImageVersion('main', 'management-service', 'v1.0.1');
  s.applyNewImageVersionPollTime(3000, 'main', 'node');
  s.applyNewImageVersion('main', 'node', 'v1.5.3+hotfix');
  s.applyNewImageVersionPendingUpdate('canary', 'node', 'v9.9.2', 9000);
  s.applyNewImageVersionPollTime(4000, 'canary', 'node');
  s.applyNewImageVersion('canary', 'node', 'v1.5.5-canary');

  t.log(JSON.stringify(s.getSnapshot(), null, 2));

  t.is(Object.keys(s.getSnapshot().CurrentImageVersions['main']).length, 2);
  t.is(s.getSnapshot().CurrentImageVersions['main']['node'], 'v1.5.3+hotfix');
  t.is(s.getSnapshot().CurrentImageVersions['main']['management-service'], 'v1.0.1');
  t.is(s.getSnapshot().CurrentImageVersions['canary']['node'], 'v1.5.5-canary');
  t.deepEqual(s.getSnapshot().CurrentImageVersionsUpdater['main']['node'], {
    LastPollTime: 3000,
    PendingVersion: '',
    PendingVersionTime: 0,
  });
  t.deepEqual(s.getSnapshot().CurrentImageVersionsUpdater['main']['management-service'], {
    LastPollTime: 2000,
    PendingVersion: '',
    PendingVersionTime: 0,
  });
  t.deepEqual(s.getSnapshot().CurrentImageVersionsUpdater['canary']['node'], {
    LastPollTime: 4000,
    PendingVersion: 'v9.9.2',
    PendingVersionTime: 9000,
  });
});

function CommitteeChanged(s: State, time: number, addrs: string[], orbsAddrs: string[]) {
  s.applyNewCommitteeChanged(time, {
    ...eventBase,
    returnValues: {
      addrs,
      orbsAddrs,
      weights: addrs.map(() => '10000'),
    },
  });
}

function StandbysChanged(s: State, time: number, addrs: string[], orbsAddrs: string[]) {
  s.applyNewStandbysChanged(time, {
    ...eventBase,
    returnValues: {
      addrs,
      orbsAddrs,
    },
  });
}

function ValidatorRegistered(s: State, time: number, addr: string, orbsAddr: string, ip: string) {
  s.applyNewValidatorRegistered(time, {
    ...eventBase,
    returnValues: {
      ip,
      addr,
      orbsAddr,
    },
  });
}

function SubscriptionChanged(s: State, time: number, vcid: string, expiresAt: number) {
  s.applyNewSubscriptionChanged(time, {
    ...eventBase,
    returnValues: {
      vcid,
      genRef: '123',
      expiresAt: expiresAt.toString(),
      tier: 'defaultTier',
      deploymentSubset: 'main',
    },
  });
}

function ProtocolVersionChanged(s: State, time: number, nextVersion: number, fromTimestamp: number) {
  s.applyNewProtocolVersionChanged(time, {
    ...eventBase,
    returnValues: {
      deploymentSubset: 'main',
      currentVersion: 'xxx',
      nextVersion: nextVersion.toString(),
      fromTimestamp: fromTimestamp.toString(),
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
