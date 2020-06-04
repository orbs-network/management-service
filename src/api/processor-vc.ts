import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { getVirtualChainPort } from './helpers';
import { ServiceConfiguration } from '../config';
// TODO: remove both after temp genesis block hack (!)
import Web3 from 'web3';
import { toNumber } from '../helpers';

export async function getVirtualChainManagement(
  vchainId: number,
  snapshot: StateSnapshot,
  config: ServiceConfiguration
) {
  // make sure the virtual chain exists
  if (!snapshot.CurrentVirtualChains[vchainId.toString()]) {
    throw new Error(`Virtual chain ${vchainId} does not exist.`);
  }

  const rolloutGroup = snapshot.CurrentVirtualChains[vchainId.toString()].RolloutGroup;

  // topology includes vchain specific data (port)
  const vchainPort = getVirtualChainPort(vchainId);
  const vchainTopology = _.cloneDeep(snapshot.CurrentTopology);
  for (const node of vchainTopology) {
    node.Port = vchainPort;
  }

  // TODO: temp genesis block hack (!) make func sync again and remove once events GenesisBlock -> GenesisRefTime
  const web3 = new Web3(config.EthereumEndpoint);
  const genesisBlock = await web3.eth.getBlock(snapshot.CurrentVirtualChains[vchainId.toString()].GenesisBlock);
  const genesisRefTime = toNumber(genesisBlock.timestamp);

  // done
  return {
    CurrentRefTime: snapshot.CurrentRefTime,
    PageStartRefTime: snapshot.PageStartRefTime,
    PageEndRefTime: snapshot.PageEndRefTime,
    VirtualChains: {
      [vchainId.toString()]: {
        VirtualChainId: vchainId,
        GenesisRefTime: genesisRefTime,
        CurrentTopology: vchainTopology,
        CommitteeEvents: snapshot.CommitteeEvents,
        SubscriptionEvents: snapshot.SubscriptionEvents[vchainId.toString()],
        ProtocolVersionEvents: snapshot.ProtocolVersionEvents[rolloutGroup],
      },
    },
  };
}
