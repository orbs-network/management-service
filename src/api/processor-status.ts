import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getCurrentClockTime } from '../helpers';
import { imageNamesToPollForNewVersions } from '../dockerhub/image-poll';

// seconds
const ETHEREUM_REF_TIME_ALLOWED_DELAY = 60 * 60;
const DOCKER_HUB_POLL_ALLOWED_DELAY = 20 * 60;

export function getServiceStatus(snapshot: StateSnapshot, config: ServiceConfiguration) {
  // verify the service is operational
  const errors = [];
  const now = getCurrentClockTime();
  const refTimeAgo = now - snapshot.CurrentRefTime;
  if (refTimeAgo > ETHEREUM_REF_TIME_ALLOWED_DELAY) {
    errors.push(`Ethereum RefTime is too old (${refTimeAgo} sec ago).`);
  }
  for (const imageName of imageNamesToPollForNewVersions) {
    const polledAgo = now - (snapshot.CurrentImageVersionsUpdateTime['main'][imageName] ?? 0);
    if (polledAgo > DOCKER_HUB_POLL_ALLOWED_DELAY) {
      errors.push(`Stable version poll for ${imageName} is too old (${polledAgo} sec ago).`);
    }
  }

  // status text
  const status = [];
  status.push(`RefTime = ${snapshot.CurrentRefTime}`);
  status.push(`committee size = ${snapshot.CurrentCommittee.length}`);
  status.push(`stable node = ${snapshot.CurrentImageVersions['main']['node']}`);

  return {
    ...(errors.length > 0 ? { Error: errors.join(' ') } : {}), // Error key is conditional
    Status: status.join(', '),
    Timestamp: new Date().toISOString(),
    Payload: {
      CurrentRefTime: snapshot.CurrentRefTime,
      CurrentCommittee: snapshot.CurrentCommittee,
      CurrentStandbys: snapshot.CurrentStandbys,
      CurrentImageVersions: snapshot.CurrentImageVersions,
      CurrentVirtualChains: snapshot.CurrentVirtualChains,
      CurrentTopology: snapshot.CurrentTopology,
      CurrentIp: snapshot.CurrentIp,
      ProtocolVersionEvents: snapshot.ProtocolVersionEvents,
      Config: config,
    },
  };
}
