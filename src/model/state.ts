import _ from 'lodash';
import { EventTypes } from '../ethereum/events-types';
import { getIpFromHex, toNumber } from '../helpers';
import { findAllEventsCoveringRange } from './helpers';
import * as Versioning from '../dockerhub/versioning';

export interface StateSnapshot {
  CurrentRefTime: number;
  PageStartRefTime: number;
  PageEndRefTime: number;
  CurrentCommittee: { EthAddress: string; OrbsAddress: string; Weight: number; IdentityType: number }[];
  CommitteeEvents: {
    RefTime: number;
    Committee: { EthAddress: string; OrbsAddress: string; Weight: number; IdentityType: number }[];
  }[];
  CurrentIp: { [EthAddress: string]: string };
  CurrentStandbys: { EthAddress: string; OrbsAddress: string }[];
  CurrentTopology: { EthAddress: string; OrbsAddress: string; Ip: string; Port: number }[]; // Port overridden by processor
  CurrentVirtualChains: {
    [VirtualChainId: string]: {
      Expiration: number;
      RolloutGroup: string;
      IdentityType: number;
      Tier: string;
      GenesisBlock: number;
    }; // TODO: change GenesisBlock to GenesisRefTime when events allow that
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
}

export class State {
  private snapshot: StateSnapshot = {
    CurrentRefTime: 0,
    PageStartRefTime: 0,
    PageEndRefTime: 0,
    CurrentCommittee: [],
    CommitteeEvents: [],
    CurrentIp: {},
    CurrentStandbys: [],
    CurrentTopology: [],
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
  };

  getSnapshot(): StateSnapshot {
    return this.snapshot;
  }

  applyNewTimeRef(time: number) {
    this.snapshot.CurrentRefTime = time;
    this.snapshot.PageEndRefTime = time;
    this.snapshot.CurrentTopology = calcTopology(time, this.snapshot);
  }

  applyNewCommitteeChanged(time: number, event: EventTypes['CommitteeChanged']) {
    const totalCommitteeWeight = _.sum(_.map(event.returnValues.weights, (w) => parseInt(w)));
    const committee = event.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
      OrbsAddress: normalizeAddress(OrbsAddress),
      EthAddress: normalizeAddress(event.returnValues.addrs[idx]),
      Weight: Math.min(
        parseInt(event.returnValues.weights[idx]),
        Math.round(totalCommitteeWeight / event.returnValues.orbsAddrs.length)
      ),
      IdentityType: 0,
    }));
    this.snapshot.CommitteeEvents.push({
      RefTime: time,
      Committee: committee,
    });
    this.snapshot.CurrentCommittee = committee;
  }

  applyNewStandbysChanged(_time: number, event: EventTypes['StandbysChanged']) {
    const standbys = event.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
      OrbsAddress: normalizeAddress(OrbsAddress),
      EthAddress: normalizeAddress(event.returnValues.addrs[idx]),
    }));
    this.snapshot.CurrentStandbys = standbys;
  }

  applyNewSubscriptionChanged(time: number, event: EventTypes['SubscriptionChanged']) {
    const eventBody = {
      Tier: event.returnValues.tier,
      RolloutGroup: event.returnValues.deploymentSubset,
      IdentityType: 0,
      GenesisBlock: toNumber(event.returnValues.genRef), // TODO: change GenesisBlock to GenesisRefTime when events allow that
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

  // TODO: replace with ValidatorsRegistration.ValidatorDataUpdated
  applyNewValidatorRegistered(_time: number, event: EventTypes['ValidatorRegistered']) {
    const EthAddress = normalizeAddress(event.returnValues.addr);
    this.snapshot.CurrentIp[EthAddress] = getIpFromHex(event.returnValues.ip);
  }

  applyNewImageVersion(rolloutGroup: string, imageName: string, imageVersion: string) {
    if (!Versioning.isValid(imageVersion)) return;
    const currentVersion = this.snapshot.CurrentImageVersions[rolloutGroup][imageName];
    // image version upgrades only go forward (we don't allow downgrade)
    if (!currentVersion || Versioning.compare(imageVersion, currentVersion) > 0) {
      this.snapshot.CurrentImageVersions[rolloutGroup][imageName] = imageVersion;
    }
  }
}

type TopologyNodes = { EthAddress: string; OrbsAddress: string; Ip: string; Port: number }[];
type CommiteeEvent = {
  RefTime: number;
  Committee: { EthAddress: string; OrbsAddress: string; Weight: number; IdentityType: number }[];
};

function calcTopology(time: number, snapshot: StateSnapshot): TopologyNodes {
  const inTopology: { [EthAddress: string]: string } = {}; // EthAddress -> OrbsAddress

  // take all committee members in last 12 hours
  const committeesInLast12Hours = findAllEventsCoveringRange(snapshot.CommitteeEvents, time - 12 * 60 * 60, time);
  for (const committeeEvent of committeesInLast12Hours) {
    const commitee = (committeeEvent as CommiteeEvent).Committee;
    for (const node of commitee as { EthAddress: string; OrbsAddress: string }[]) {
      inTopology[node.EthAddress] = node.OrbsAddress; // override old Orbs addresses with new ones
    }
  }

  // take last standbys
  for (const node of snapshot.CurrentStandbys) {
    inTopology[node.EthAddress] = node.OrbsAddress;
  }

  // done
  return Object.keys(inTopology).map((EthAddress) => ({
    EthAddress,
    OrbsAddress: inTopology[EthAddress],
    Ip: snapshot.CurrentIp[EthAddress],
    Port: 0,
  }));
}

function normalizeAddress(address: string): string {
  if (!address) return address;
  if (address.startsWith('0x')) return address.substr(2).toLowerCase();
  return address.toLowerCase();
}
