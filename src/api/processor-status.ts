import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';

export function getServiceStatus(snapshot: StateSnapshot, config: ServiceConfiguration) {
  return {
    CurrentRefTime: snapshot.CurrentRefTime,
    CurrentCommittee: snapshot.CurrentCommittee,
    CurrentStandbys: snapshot.CurrentStandbys,
    CurrentImageVersions: snapshot.CurrentImageVersions,
    CurrentVirtualChains: snapshot.CurrentVirtualChains,
    CurrentTopology: snapshot.CurrentTopology,
    CurrentIp: snapshot.CurrentIp,
    ProtocolVersionEvents: snapshot.ProtocolVersionEvents,
    Config: config,
  };
}
