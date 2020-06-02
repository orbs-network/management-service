import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { getVirtualChainPort } from './helpers';

export function getVirtualChainManagement(vchainId: number, snapshot: StateSnapshot) {
    // topology includes vchain specific data (port)
    const vchainPort = getVirtualChainPort(vchainId);
    const vchainTopology = _.cloneDeep(snapshot.CurrentTopology);
    for (const node of vchainTopology) {
        node.Port = vchainPort;
    }

    // done
    return {
        CurrentRefTime: snapshot.CurrentRefTime,
        PageStartRefTime: snapshot.PageStartRefTime,
        PageEndRefTime: snapshot.PageEndRefTime,
        VirtualChains: {
            [vchainId.toString()]: {
                VirtualChainId: vchainId,
                CurrentTopology: vchainTopology,
                CommitteeEvents: snapshot.CommitteeEvents,
                SubscriptionEvents: snapshot.SubscriptionEvents[vchainId.toString()] || [],
                ProtocolVersionEvents: snapshot.ProtocolVersionEvents,
            },
        },
    };
}
