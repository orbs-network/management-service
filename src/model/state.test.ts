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

    ValidatorRegistered(s, 1000, 'A', 'a1', '0x01010101');
    ValidatorRegistered(s, 1000, 'B', 'b1', '0x02020202');
    ValidatorRegistered(s, 1000, 'C', 'c1', '0x03030303');
    ValidatorRegistered(s, 1000, 'M', 'm1', '0x04040404');
    ValidatorRegistered(s, 1000, 'N', 'n1', '0x05050505');
    CommitteeChanged(s, 1000, ['A', 'B', 'C'], ['a1', 'b1', 'c1']);
    StandbysChanged(s, 1000, ['M', 'N'], ['m1', 'n1']);
    s.applyNewTimeRef(1000);

    ValidatorRegistered(s, 2000, 'Z', 'z2', '0x06060606');
    ValidatorRegistered(s, 2000, 'A', 'a2', '0x07070707');
    ValidatorRegistered(s, 2000, 'O', 'o2', '0x08080808');
    CommitteeChanged(s, 2000, ['Z', 'B', 'C'], ['z2', 'b2', 'c2']);
    StandbysChanged(s, 2000, ['N', 'O'], ['n2', 'o2']);
    s.applyNewTimeRef(2000);

    ValidatorRegistered(s, day + 3000, 'X', 'x3', '0x09090909');
    ValidatorRegistered(s, day + 3000, 'Z', 'z3', '0x0a0a0a0a');
    ValidatorRegistered(s, day + 3000, 'Z', 'z3', '0x0b0b0b0b');
    ValidatorRegistered(s, day + 3000, 'P', 'p3', '0x0c0c0c0c');
    CommitteeChanged(s, day + 3000, ['X', 'Z'], ['x3', 'z3']);
    StandbysChanged(s, day + 3000, ['O', 'P'], ['o3', 'p3']);
    s.applyNewTimeRef(day + 3000);

    console.log(JSON.stringify(s.getSnapshot(), null, 2));

    t.is(s.getSnapshot().CurrentIp['A'], '7.7.7.7');
    t.is(s.getSnapshot().CurrentIp['B'], '2.2.2.2');
    t.is(s.getSnapshot().CurrentIp['C'], '3.3.3.3');
    t.is(s.getSnapshot().CurrentIp['M'], '4.4.4.4');
    t.is(s.getSnapshot().CurrentIp['N'], '5.5.5.5');
    t.is(s.getSnapshot().CurrentIp['Z'], '11.11.11.11');
    t.is(s.getSnapshot().CurrentIp['O'], '8.8.8.8');
    t.is(s.getSnapshot().CurrentIp['X'], '9.9.9.9');
    t.is(s.getSnapshot().CurrentIp['P'], '12.12.12.12');

    t.deepEqual(s.getSnapshot().CurrentStandbys, [
        { EthAddress: 'O', OrbsAddress: 'o3' },
        { EthAddress: 'P', OrbsAddress: 'p3' },
    ]);

    t.is(s.getSnapshot().CommitteeEvents.length, 3);
    t.is(s.getSnapshot().CommitteeEvents[0].RefTime, 1000);
    t.deepEqual(s.getSnapshot().CommitteeEvents[0].Committee, [
        { EthAddress: 'A', OrbsAddress: 'a1', EffectiveStake: 1, IdentityType: 0 },
        { EthAddress: 'B', OrbsAddress: 'b1', EffectiveStake: 1, IdentityType: 0 },
        { EthAddress: 'C', OrbsAddress: 'c1', EffectiveStake: 1, IdentityType: 0 },
    ]);
    t.is(s.getSnapshot().CommitteeEvents[1].RefTime, 2000);
    t.deepEqual(s.getSnapshot().CommitteeEvents[1].Committee, [
        { EthAddress: 'Z', OrbsAddress: 'z2', EffectiveStake: 1, IdentityType: 0 },
        { EthAddress: 'B', OrbsAddress: 'b2', EffectiveStake: 1, IdentityType: 0 },
        { EthAddress: 'C', OrbsAddress: 'c2', EffectiveStake: 1, IdentityType: 0 },
    ]);
    t.is(s.getSnapshot().CommitteeEvents[2].RefTime, day + 3000);
    t.deepEqual(s.getSnapshot().CommitteeEvents[2].Committee, [
        { EthAddress: 'X', OrbsAddress: 'x3', EffectiveStake: 1, IdentityType: 0 },
        { EthAddress: 'Z', OrbsAddress: 'z3', EffectiveStake: 1, IdentityType: 0 },
    ]);

    t.deepEqual(s.getSnapshot().CurrentTopology, [
        { EthAddress: 'Z', OrbsAddress: 'z3', Ip: '11.11.11.11', Port: 0 },
        { EthAddress: 'B', OrbsAddress: 'b2', Ip: '2.2.2.2', Port: 0 },
        { EthAddress: 'C', OrbsAddress: 'c2', Ip: '3.3.3.3', Port: 0 },
        { EthAddress: 'X', OrbsAddress: 'x3', Ip: '9.9.9.9', Port: 0 },
        { EthAddress: 'O', OrbsAddress: 'o3', Ip: '8.8.8.8', Port: 0 },
        { EthAddress: 'P', OrbsAddress: 'p3', Ip: '12.12.12.12', Port: 0 },
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

    console.log(JSON.stringify(s.getSnapshot(), null, 2));

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

    console.log(JSON.stringify(s.getSnapshot(), null, 2));

    t.is(s.getSnapshot().ProtocolVersionEvents.length, 3);
    t.is(s.getSnapshot().ProtocolVersionEvents[0].RefTime, 1500);
    t.is(s.getSnapshot().ProtocolVersionEvents[0].Data.Version, 5);
    t.is(s.getSnapshot().ProtocolVersionEvents[1].RefTime, 2500);
    t.is(s.getSnapshot().ProtocolVersionEvents[1].Data.Version, 6);
    t.is(s.getSnapshot().ProtocolVersionEvents[2].RefTime, 5500);
    t.is(s.getSnapshot().ProtocolVersionEvents[2].Data.Version, 8);
});

test('state applies monotonous image version changes', (t) => {
    const s = new State();

    s.applyNewImageVersion('node', 'v1.0.0');
    s.applyNewImageVersion('management-service', 'v1.0.1');
    s.applyNewImageVersion('node', 'v1.5.3+hotfix');
    s.applyNewImageVersion('node', 'v3.1.1');
    s.applyNewImageVersion('management-service', 'v1.9.0+hotfix');
    s.applyNewImageVersion('node', 'v2.9.9'); // ignore versions going backwards
    s.applyNewImageVersion('node', 'v1.0.0');
    s.applyNewImageVersion('node', 'v9.9.9-cc1cc788');

    console.log(JSON.stringify(s.getSnapshot(), null, 2));

    t.is(Object.keys(s.getSnapshot().CurrentImageVersions).length, 2);
    t.is(s.getSnapshot().CurrentImageVersions['node'], 'v3.1.1');
    t.is(s.getSnapshot().CurrentImageVersions['management-service'], 'v1.9.0+hotfix');
});

function CommitteeChanged(s: State, time: number, addrs: string[], orbsAddrs: string[]) {
    s.applyNewCommitteeChanged(time, {
        ...eventBase,
        returnValues: {
            addrs,
            orbsAddrs,
            weights: ['1', '1', '1'],
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
            genRef: 'gR',
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
