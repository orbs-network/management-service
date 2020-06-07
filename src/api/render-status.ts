import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getCurrentClockTime, JsonResponse } from '../helpers';
import { imageNamesToPollForNewVersions } from '../dockerhub/image-poll';

const ETHEREUM_REF_TIME_ALLOWED_DELAY = 60 * 60; // seconds
const DOCKER_HUB_POLL_ALLOWED_DELAY = 20 * 60; // seconds

export function renderServiceStatus(snapshot: StateSnapshot, config: ServiceConfiguration) {
  const response: JsonResponse = {
    Status: getStatusText(snapshot),
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

  // include error field if found errors
  const errorText = getErrorText(snapshot);
  if (errorText) {
    response.Error = errorText;
  }

  return response;
}

// helpers

function getStatusText(snapshot: StateSnapshot) {
  const res = [];
  res.push(`RefTime = ${snapshot.CurrentRefTime}`);
  res.push(`committee size = ${snapshot.CurrentCommittee.length}`);
  res.push(`stable node = ${snapshot.CurrentImageVersions['main']['node']}`);
  return res.join(', ');
}

function getErrorText(snapshot: StateSnapshot) {
  const res = [];
  const now = getCurrentClockTime();
  const refTimeAgo = now - snapshot.CurrentRefTime;
  if (refTimeAgo > ETHEREUM_REF_TIME_ALLOWED_DELAY) {
    res.push(`Ethereum RefTime is too old (${refTimeAgo} sec ago).`);
  }
  for (const imageName of imageNamesToPollForNewVersions) {
    const polledAgo = now - (snapshot.CurrentImageVersionsUpdateTime['main'][imageName] ?? 0);
    if (polledAgo > DOCKER_HUB_POLL_ALLOWED_DELAY) {
      res.push(`Stable version poll for ${imageName} is too old (${polledAgo} sec ago).`);
    }
  }
  return res.join(' ');
}
