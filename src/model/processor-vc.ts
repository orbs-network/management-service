import _ from 'lodash';
import { StateSnapshot } from './state';
import { ServiceConfiguration } from '../data-types';
import { getVirtualChainPort } from '../ports';

export function getVirtualChainManagement(vchainId: string, snapshot: StateSnapshot, _config: ServiceConfiguration) {
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
            [vchainId]: {
                VirtualChainId: vchainId,
                CurrentTopology: vchainTopology,
                CommitteeEvents: snapshot.CurrentTopology,
                SubscriptionEvents: snapshot.SubscriptionEvents[vchainId],
                ProtocolVersionEvents: snapshot.ProtocolVersionEvents,
            },
        },
    };
}
