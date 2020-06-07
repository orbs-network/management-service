import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { getVirtualChainPort } from './ports';
import { ServiceConfiguration } from '../config';
// TODO: remove both after temp genesis block hack (!)
import Web3 from 'web3';
import { toNumber, JsonResponse } from '../helpers';

export async function renderVirtualChainManagement(
  vchainId: number,
  snapshot: StateSnapshot,
  config: ServiceConfiguration
) {
  // make sure the virtual chain exists
  if (!snapshot.CurrentVirtualChains[vchainId.toString()]) {
    throw new Error(`Virtual chain ${vchainId} does not exist.`);
  }

  // TODO: temp genesis block hack (!) make func sync again and remove once events GenesisBlock -> GenesisRefTime
  const web3 = new Web3(config.EthereumEndpoint);
  const genesisBlock = await web3.eth.getBlock(snapshot.CurrentVirtualChains[vchainId.toString()].GenesisBlock);
  const genesisRefTime = toNumber(genesisBlock.timestamp);

  const response: JsonResponse = {
    CurrentRefTime: snapshot.CurrentRefTime,
    PageStartRefTime: snapshot.PageStartRefTime,
    PageEndRefTime: snapshot.PageEndRefTime,
    VirtualChains: {
      [vchainId.toString()]: {
        VirtualChainId: vchainId,
        GenesisRefTime: genesisRefTime,
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
