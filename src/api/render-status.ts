import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getCurrentClockTime, JsonResponse, DailyStatsData, day } from '../helpers';
import { imageNamesToPollForNewVersions } from '../dockerhub/image-poll';
import { findAllEventsCoveringRange } from '../model/find';

const ETHEREUM_REF_TIME_ALLOWED_DELAY = 20 * 60; // seconds
const DOCKER_HUB_POLL_ALLOWED_DELAY = 20 * 60; // seconds

const timeOriginallyLaunched = getCurrentClockTime();

export function renderServiceStatus(snapshot: StateSnapshot, stats: DailyStatsData, config: ServiceConfiguration) {
  const response: JsonResponse = {
    Status: getStatusText(snapshot),
    Timestamp: new Date().toISOString(),
    Payload: {
      Uptime: getCurrentClockTime() - timeOriginallyLaunched,
      MemoryBytesUsed: process.memoryUsage().heapUsed,
      Version: {
        Semantic: snapshot.CurrentVersion,
      },
      CurrentRefTime: snapshot.CurrentRefTime,
      CurrentRefBlock: snapshot.CurrentRefBlock,
      CurrentCommittee: snapshot.CurrentCommittee,
      CurrentCandidates: snapshot.CurrentCandidates,
      CurrentTopology: snapshot.CurrentTopology,
      CurrentImageVersions: snapshot.CurrentImageVersions,
      CurrentImageVersionsUpdater: snapshot.CurrentImageVersionsUpdater,
      CurrentVirtualChains: snapshot.CurrentVirtualChains,
      ProtocolVersionEvents: snapshot.ProtocolVersionEvents,
      CurrentContractAddress: snapshot.CurrentContractAddress,
      ContractAddressChanges: snapshot.ContractAddressChanges,
      Guardians: _.mapValues(snapshot.CurrentOrbsAddress, (OrbsAddress, EthAddress) => {
        return {
          EthAddress,
          OrbsAddress,
          Ip: snapshot.CurrentIp[EthAddress],
          EffectiveStake: snapshot.CurrentEffectiveStake[EthAddress] ?? 0,
          SelfStake: snapshot.CurrentDetailedStake[EthAddress]?.SelfStake ?? 0,
          DelegatedStake: snapshot.CurrentDetailedStake[EthAddress]?.DelegatedStake ?? 0,
          ElectionsStatus: snapshot.CurrentElectionsStatus[EthAddress],
          ...snapshot.CurrentRegistrationData[EthAddress],
        };
      }),
      EthereumRequestStats: stats,
      CommitteeEvents: findAllEventsCoveringRange(
        snapshot.CommitteeEvents,
        snapshot.CurrentRefTime - 60 * day,
        snapshot.CurrentRefTime
      ),
      Config: config,
    },
  };

  // include error field if found errors
  const errorText = getErrorText(snapshot);
  if (errorText && !config.BootstrapMode) {
    response.Error = errorText;
  }

  return response;
}

// helpers

function getStatusText(snapshot: StateSnapshot) {
  const res = [];
  const now = getCurrentClockTime();
  const refTimeAgo = now - snapshot.CurrentRefTime;
  res.push(`RefTime = ${snapshot.CurrentRefTime} (${refTimeAgo} sec ago)`);
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
    const polledAgo = now - (snapshot.CurrentImageVersionsUpdater['main'][imageName]?.LastPollTime ?? 0);
    if (polledAgo > DOCKER_HUB_POLL_ALLOWED_DELAY) {
      res.push(`Stable version poll for ${imageName} is too old (${polledAgo} sec ago).`);
    }
  }
  // only go over images that we really care if the canary version is found or not
  for (const imageName of ['node']) {
    const polledAgo = now - (snapshot.CurrentImageVersionsUpdater['canary'][imageName]?.LastPollTime ?? 0);
    if (polledAgo > DOCKER_HUB_POLL_ALLOWED_DELAY) {
      res.push(`Canary version poll for ${imageName} is too old (${polledAgo} sec ago).`);
    }
  }
  return res.join(' ');
}
