import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { getVirtualChainPort } from './ports';
import { ServiceConfiguration } from '../config';
import { JsonResponse } from '../helpers';

export function renderVirtualChainManagement(vchainId: number, snapshot: StateSnapshot, _config: ServiceConfiguration) {
  // make sure the virtual chain exists
  if (!snapshot.CurrentVirtualChains[vchainId.toString()]) {
    throw new Error(`Virtual chain ${vchainId} does not exist.`);
  }

  const response: JsonResponse = {
    CurrentRefTime: snapshot.CurrentRefTime,
    PageStartRefTime: snapshot.LastPageCommitteeEvents[0].RefTime,
    PageEndRefTime: snapshot.PageEndRefTime,
    VirtualChains: {
      [vchainId.toString()]: {
        VirtualChainId: vchainId,
        GenesisRefTime: snapshot.CurrentVirtualChains[vchainId.toString()].GenesisRefTime,
        CurrentTopology: getCurrentTopology(vchainId, snapshot),
        CommitteeEvents: snapshot.LastPageCommitteeEvents,
        SubscriptionEvents: snapshot.SubscriptionEvents[vchainId.toString()],
        ProtocolVersionEvents: getProtocolVersionEvents(vchainId, snapshot),
      },
    },
  };

  return response;
}

// TODO future, use time to read the correct page of committee events
export function renderHistoricVirtualChainManagement(vchainId: number, _time: number, snapshot: StateSnapshot, _config: ServiceConfiguration) {
  // make sure the virtual chain exists
  if (!snapshot.CurrentVirtualChains[vchainId.toString()]) {
    throw new Error(`Virtual chain ${vchainId} does not exist.`);
  }

  const response: JsonResponse = {
    CurrentRefTime: snapshot.CurrentRefTime,
    PageStartRefTime: snapshot.PageStartRefTime,
    PageEndRefTime: snapshot.PageEndRefTime,
    VirtualChains: {
      [vchainId.toString()]: {
        VirtualChainId: vchainId,
        GenesisRefTime: snapshot.CurrentVirtualChains[vchainId.toString()].GenesisRefTime,
        CurrentTopology: getCurrentTopology(vchainId, snapshot),
        CommitteeEvents: snapshot.CommitteeEvents,
        SubscriptionEvents: snapshot.SubscriptionEvents[vchainId.toString()],
        ProtocolVersionEvents: getProtocolVersionEvents(vchainId, snapshot),
      },
    },
  };

  return response;
}

// helpers

function getCurrentTopology(vchainId: number, snapshot: StateSnapshot) {
  const res = _.cloneDeep(snapshot.CurrentTopology);
  const vchainPort = getVirtualChainPort(vchainId);
  for (const node of res) {
    node.Port = vchainPort;
  }
  return res;
}

function getProtocolVersionEvents(vchainId: number, snapshot: StateSnapshot) {
  const rolloutGroup = snapshot.CurrentVirtualChains[vchainId.toString()].RolloutGroup;
  return snapshot.ProtocolVersionEvents[rolloutGroup];
}
