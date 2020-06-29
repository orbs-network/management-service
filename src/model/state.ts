import _ from 'lodash';
import { EventTypes } from '../ethereum/events-types';
import { getIpFromHex, toNumber } from '../helpers';
import { findAllEventsCoveringRange } from './find';

export interface StateSnapshot {
  CurrentRefTime: number; // primary, everything is by time
  CurrentRefBlock: number;
  PageStartRefTime: number;
  PageEndRefTime: number;
  CurrentCommittee: { EthAddress: string; Weight: number; OriginalWeight: number }[];
  CommitteeEvents: {
    RefTime: number;
    Committee: { EthAddress: string; OrbsAddress: string; Weight: number; IdentityType: number }[];
  }[];
  LastCommitteeEvent: { EthAddress: string; OrbsAddress: string; Weight: number; IdentityType: number }[],
  CurrentIp: { [EthAddress: string]: string };
  CurrentOrbsAddress: { [EthAddress: string]: string };
  CurrentStandbys: { EthAddress: string }[];
  CurrentTopology: { EthAddress: string; OrbsAddress: string; Ip: string; Port: number }[]; // Port overridden by processor
  CurrentElectionsStatus: {
    [EthAddress: string]: {
      LastUpdateTime: number;
      ReadyToSync: boolean;
      ReadyForCommittee: boolean;
    };
  };
  CurrentVirtualChains: {
    [VirtualChainId: string]: {
      Expiration: number;
      RolloutGroup: string;
      IdentityType: number;
      Tier: string;
      GenesisRefTime: number;
    };
  };
  SubscriptionEvents: {
    [VirtualChainId: string]: {
      RefTime: number;
      Data: { Status: 'active' | 'expired'; Tier: string; RolloutGroup: string; IdentityType: number };
    }[];
  };
  ProtocolVersionEvents: {
    [RolloutGroup: string]: {
      RefTime: number;
      Data: { Version: number };
    }[];
  };
  CurrentImageVersions: {
    [RolloutGroup: string]: { [ImageName: string]: string };
  };
  CurrentImageVersionsUpdater: {
    [RolloutGroup: string]: {
      [ImageName: string]: {
        LastPollTime: number;
        PendingVersion: string;
        PendingVersionTime: number;
      };
    };
  };
}

export class State {
  private snapshot: StateSnapshot = {
    CurrentRefTime: 0,
    CurrentRefBlock: 0,
    PageStartRefTime: 0,
    PageEndRefTime: 0,
    CurrentCommittee: [],
    CommitteeEvents: [],
    LastCommitteeEvent: [],
    CurrentIp: {},
    CurrentOrbsAddress: {},
    CurrentStandbys: [],
    CurrentTopology: [],
    CurrentElectionsStatus: {},
    CurrentVirtualChains: {},
    SubscriptionEvents: {},
    ProtocolVersionEvents: {
      main: [],
      canary: [],
    },
    CurrentImageVersions: {
      main: {},
      canary: {},
    },
    CurrentImageVersionsUpdater: {
      main: {},
      canary: {},
    },
  };

  getSnapshot(): StateSnapshot {
    return this.snapshot;
  }

  applyNewTimeRef(time: number, block: number) {
    this.snapshot.CurrentRefTime = time;
    this.snapshot.CurrentRefBlock = block;
    this.snapshot.PageEndRefTime = time;
    const committeeEvent = calcNewCommitteeEvent(time, this.snapshot);
    if (!_.isEqual(committeeEvent.Committee, this.snapshot.LastCommitteeEvent)) {
      this.snapshot.CommitteeEvents.push(committeeEvent);
      this.snapshot.LastCommitteeEvent = _.cloneDeep(committeeEvent.Committee);
    }
    this.snapshot.CurrentTopology = calcTopology(time, this.snapshot);
  }

  applyNewValidatorCommitteeChange(_time: number, event: EventTypes['ValidatorCommitteeChange']) {
    const EthAddress = normalizeAddress(event.returnValues.addr);

    // current standbys
    _.remove(this.snapshot.CurrentStandbys, (node) => node.EthAddress == EthAddress);
    if (event.returnValues.isStandby) {
      this.snapshot.CurrentStandbys.push({
        EthAddress,
      });
    }
    this.snapshot.CurrentStandbys = _.sortBy(this.snapshot.CurrentStandbys, (node) => node.EthAddress);

    // current committee
    _.remove(this.snapshot.CurrentCommittee, (node) => node.EthAddress == EthAddress);
    if (event.returnValues.inCommittee) {
      this.snapshot.CurrentCommittee.push({
        EthAddress,
        OriginalWeight: parseInt(event.returnValues.weight),
        Weight: 0,
      });
    }
    fixCommitteeWeights(this.snapshot.CurrentCommittee);
    this.snapshot.CurrentCommittee = _.sortBy(this.snapshot.CurrentCommittee, (node) => node.EthAddress);
    this.snapshot.CurrentCommittee = _.sortBy(this.snapshot.CurrentCommittee, (node) => -1 * node.Weight);
  }

  applyNewValidatorDataUpdated(_time: number, event: EventTypes['ValidatorDataUpdated']) {
    const EthAddress = normalizeAddress(event.returnValues.addr);
    this.snapshot.CurrentOrbsAddress[EthAddress] = normalizeAddress(event.returnValues.orbsAddr);
    this.snapshot.CurrentIp[EthAddress] = getIpFromHex(event.returnValues.ip);
  }

  applyNewValidatorStatusUpdated(time: number, event: EventTypes['ValidatorStatusUpdated']) {
    const EthAddress = normalizeAddress(event.returnValues.addr);
    this.snapshot.CurrentElectionsStatus[EthAddress] = {
      LastUpdateTime: time,
      ReadyToSync: event.returnValues.readyToSync,
      ReadyForCommittee: event.returnValues.readyForCommittee,
    };
  }

  applyNewSubscriptionChanged(time: number, event: EventTypes['SubscriptionChanged']) {
    const eventBody = {
      Tier: event.returnValues.tier,
      RolloutGroup: event.returnValues.deploymentSubset,
      IdentityType: 0,
      GenesisRefTime: toNumber(event.returnValues.genRefTime),
    };
    this.snapshot.CurrentVirtualChains[event.returnValues.vcid] = {
      Expiration: toNumber(event.returnValues.expiresAt),
      ...eventBody,
    };
    const existingEvents = this.snapshot.SubscriptionEvents[event.returnValues.vcid] ?? [];
    const noFutureEvents = _.filter(existingEvents, (event) => event.RefTime <= time);
    noFutureEvents.push({
      RefTime: time,
      Data: { Status: 'active', ...eventBody },
    });
    noFutureEvents.push({
      RefTime: toNumber(event.returnValues.expiresAt),
      Data: { Status: 'expired', ...eventBody },
    });
    this.snapshot.SubscriptionEvents[event.returnValues.vcid] = noFutureEvents;
  }

  applyNewProtocolVersionChanged(time: number, event: EventTypes['ProtocolVersionChanged']) {
    const rolloutGroup = event.returnValues.deploymentSubset;
    const existingEvents = this.snapshot.ProtocolVersionEvents[rolloutGroup];
    const noFutureEvents = _.filter(existingEvents, (event) => event.RefTime <= time);
    noFutureEvents.push({
      RefTime: toNumber(event.returnValues.fromTimestamp),
      Data: { Version: toNumber(event.returnValues.nextVersion) },
    });
    this.snapshot.ProtocolVersionEvents[rolloutGroup] = noFutureEvents;
  }

  applyNewImageVersion(rolloutGroup: string, imageName: string, imageVersion: string) {
    this.snapshot.CurrentImageVersions[rolloutGroup][imageName] = imageVersion;
  }

  applyNewImageVersionPollTime(time: number, rolloutGroup: string, imageName: string) {
    const updaterStats = this.snapshot.CurrentImageVersionsUpdater[rolloutGroup][imageName] ?? {
      LastPollTime: 0,
      PendingVersion: '',
      PendingVersionTime: 0,
    };
    this.snapshot.CurrentImageVersionsUpdater[rolloutGroup][imageName] = {
      ...updaterStats,
      LastPollTime: time,
    };
  }

  // defaults in place to show how to clear a pending update
  applyNewImageVersionPendingUpdate(rolloutGroup: string, imageName: string, pendingVersion = '', pendingTime = 0) {
    const updaterStats = this.snapshot.CurrentImageVersionsUpdater[rolloutGroup][imageName] ?? {
      LastPollTime: 0,
      PendingVersion: '',
      PendingVersionTime: 0,
    };
    this.snapshot.CurrentImageVersionsUpdater[rolloutGroup][imageName] = {
      ...updaterStats,
      PendingVersion: pendingVersion,
      PendingVersionTime: pendingTime,
    };
  }
}

type CommiteeNodes = { EthAddress: string; Weight: number; OriginalWeight: number }[];
type TopologyNodes = { EthAddress: string; OrbsAddress: string; Ip: string; Port: number }[];
type CommiteeEvent = {
  RefTime: number;
  Committee: { EthAddress: string; OrbsAddress: string; Weight: number; IdentityType: number }[];
};

function calcTopology(time: number, snapshot: StateSnapshot): TopologyNodes {
  const inTopology: { [EthAddress: string]: boolean } = {}; // EthAddress -> true

  // take all committee members in last 12 hours
  const committeesInLast12Hours = findAllEventsCoveringRange(snapshot.CommitteeEvents, time - 12 * 60 * 60, time);
  for (const committeeEvent of committeesInLast12Hours) {
    const commitee = (committeeEvent as CommiteeEvent).Committee;
    for (const node of commitee as { EthAddress: string }[]) {
      inTopology[node.EthAddress] = true;
    }
  }

  // take last standbys
  for (const node of snapshot.CurrentStandbys) {
    inTopology[node.EthAddress] = true;
  }

  // done
  const res = Object.keys(inTopology).map((EthAddress) => ({
    EthAddress,
    OrbsAddress: snapshot.CurrentOrbsAddress[EthAddress],
    Ip: snapshot.CurrentIp[EthAddress],
    Port: 0,
  }));
  return _.sortBy(res, (node) => node.EthAddress);
}

function fixCommitteeWeights(committee: CommiteeNodes): void {
  const totalOriginalWeight = _.sum(_.map(committee, (node) => node.OriginalWeight));
  for (const node of committee) {
    node.Weight = Math.max(node.OriginalWeight, Math.round(totalOriginalWeight / committee.length));
  }
}

function calcNewCommitteeEvent(time: number, snapshot: StateSnapshot): CommiteeEvent {
  return {
    RefTime: time,
    Committee: snapshot.CurrentCommittee.map(({ EthAddress, Weight }) => ({
      EthAddress,
      OrbsAddress: snapshot.CurrentOrbsAddress[EthAddress],
      Weight,
      IdentityType: 0,
    })),
  };
}

function normalizeAddress(address: string): string {
  if (!address) return address;
  if (address.startsWith('0x')) return address.substr(2).toLowerCase();
  return address.toLowerCase();
}
