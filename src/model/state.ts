import _ from 'lodash';
import { EventTypes } from '../ethereum/events-types';
import { getIpFromHex, toNumber } from '../helpers';
import { findAllEventsInRange } from './helpers';
import * as Versioning from '../dockerhub/versioning';

export interface StateSnapshot {
    CurrentRefTime: number;
    PageStartRefTime: number;
    PageEndRefTime: number;
    CommitteeEvents: {
        RefTime: number;
        Committee: { EthAddress: string; OrbsAddress: string; EffectiveStake: number; IdentityType: number }[];
    }[];
    CurrentIp: { [EthAddress: string]: string };
    CurrentStandbys: { EthAddress: string; OrbsAddress: string }[];
    CurrentTopology: { EthAddress: string; OrbsAddress: string; Ip: string; Port: number }[]; // Port overridden by processor
    CurrentVirtualChains: {
        [VirtualChainId: string]: { Expiration: number; RolloutGroup: string; IdentityType: number };
    };
    SubscriptionEvents: {
        [VirtualChainId: string]: {
            RefTime: number;
            Data: { Status: 'active' | 'expired'; Tier: string; RolloutGroup: string; IdentityType: number };
        }[];
    };
    ProtocolVersionEvents: {
        RefTime: number;
        Data: { RolloutGroup: string; Version: number };
    }[];
    CurrentImageVersions: { [ImageName: string]: string };
}

export class State {
    private snapshot: StateSnapshot = {
        CurrentRefTime: 0,
        PageStartRefTime: 0,
        PageEndRefTime: 0,
        CommitteeEvents: [],
        CurrentIp: {},
        CurrentStandbys: [],
        CurrentTopology: [],
        CurrentVirtualChains: {},
        SubscriptionEvents: {},
        ProtocolVersionEvents: [],
        CurrentImageVersions: {},
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
        const committee = event.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
            OrbsAddress,
            EthAddress: event.returnValues.addrs[idx],
            EffectiveStake: parseInt(event.returnValues.weights[idx]),
            IdentityType: 0,
        }));
        this.snapshot.CommitteeEvents.push({
            RefTime: time,
            Committee: committee,
        });
    }

    applyNewStandbysChanged(_time: number, event: EventTypes['StandbysChanged']) {
        const standbys = event.returnValues.orbsAddrs.map((OrbsAddress, idx) => ({
            OrbsAddress,
            EthAddress: event.returnValues.addrs[idx],
        }));
        this.snapshot.CurrentStandbys = standbys;
    }

    applyNewSubscriptionChanged(time: number, event: EventTypes['SubscriptionChanged']) {
        const eventBody = {
            Tier: event.returnValues.tier,
            RolloutGroup: event.returnValues.deploymentSubset,
            IdentityType: 0,
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
        const eventBody = { RolloutGroup: event.returnValues.deploymentSubset };
        const existingEvents = this.snapshot.ProtocolVersionEvents;
        const noFutureEvents = _.filter(existingEvents, (event) => event.RefTime <= time);
        noFutureEvents.push({
            RefTime: toNumber(event.returnValues.fromTimestamp),
            Data: { Version: toNumber(event.returnValues.nextVersion), ...eventBody },
        });
        this.snapshot.ProtocolVersionEvents = noFutureEvents;
    }

    // TODO: replace with ValidatorsRegistration.ValidatorDataUpdated
    applyNewValidatorRegistered(_time: number, event: EventTypes['ValidatorRegistered']) {
        this.snapshot.CurrentIp[event.returnValues.addr] = getIpFromHex(event.returnValues.ip);
    }

    applyNewImageVersion(imageName: string, imageVersion: string) {
        if (!Versioning.isValid(imageVersion)) return;
        const currentVersion = this.snapshot.CurrentImageVersions[imageName];
        if (!currentVersion || Versioning.compare(imageVersion, currentVersion) > 0) {
            this.snapshot.CurrentImageVersions[imageName] = imageVersion;
        }
    }
}

type TopologyNodes = { EthAddress: string; OrbsAddress: string; Ip: string; Port: number }[];
type CommiteeEvent = {
    RefTime: number;
    Committee: { EthAddress: string; OrbsAddress: string; EffectiveStake: number; IdentityType: number }[];
};

function calcTopology(time: number, snapshot: StateSnapshot): TopologyNodes {
    const inTopology: { [EthAddress: string]: string } = {}; // EthAddress -> OrbsAddress

    // take all committee members in last 12 hours
    const committeesInLast12Hours = findAllEventsInRange(snapshot.CommitteeEvents, time - 12 * 60 * 60, time);
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
