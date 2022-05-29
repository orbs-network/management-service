import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getCurrentClockTime, JsonResponse, DailyStatsData, day } from '../helpers';
import { imageNamesToPollForNewVersions } from '../deployment/image-poll';
import { findAllEventsCoveringRange } from '../model/find';

const ETHEREUM_REF_TIME_ALLOWED_DELAY = 20 * 60; // seconds
const DOCKER_HUB_POLL_ALLOWED_DELAY = 60 * 60; // seconds

const timeOriginallyLaunched = getCurrentClockTime();

export function renderServiceStatus(snapshot: StateSnapshot, stats: DailyStatsData, config: ServiceConfiguration) {
  const response: JsonResponse = renderServiceStatusBase(snapshot, stats, config);
  return response;
}

export function renderServiceStatusAnalytics(
  snapshot: StateSnapshot,
  stats: DailyStatsData,
  config: ServiceConfiguration
) {
  const response: JsonResponse = renderServiceStatusBase(snapshot, stats, config);
  response.Payload.CommitteeEvents = findAllEventsCoveringRange(
    snapshot.CommitteeEvents,
    snapshot.CurrentRefTime - 60 * day,
    snapshot.CurrentRefTime
  );

  return response;
}

export function getParticipation(snapshot: StateSnapshot, periodSec: number): { [guardianAddress: string]: number } {
  const aggregatedWeights: { [guardianAddress: string]: number } = {};
  const upperBound = snapshot.CurrentRefTime;
  const lowerBound = upperBound - periodSec;
  const totalWeight = upperBound - lowerBound;
  let overlappingSetFound = false;

  if (totalWeight < 1) {
    throw new Error('period must be larger than 0 seconds and the currentRefTime must be larger than period');
  }

  for (let i = 0; i < snapshot.CommitteeSets.length; i++) {
    const set = snapshot.CommitteeSets[i];
    const to = Math.min(snapshot.CommitteeSets[i + 1]?.RefTime || upperBound, upperBound);
    const firstSetPartialOverlap = !overlappingSetFound && set.RefTime < lowerBound && to >= lowerBound;
    const from = firstSetPartialOverlap ? lowerBound : set.RefTime; // clip start of period to window lower bound

    if (to <= lowerBound || from >= upperBound) {
      continue; // set does not overlap with window
    }
    overlappingSetFound = true;

    const weight = to - from;

    for (let j = 0; j < set.CommitteeEthAddresses.length; j++) {
      const addr = set.CommitteeEthAddresses[j];
      aggregatedWeights[addr] = (aggregatedWeights[addr] || 0) + weight;
    }
  }

  Object.keys(aggregatedWeights).forEach((addr) => (aggregatedWeights[addr] /= totalWeight));
  return aggregatedWeights;
}

function renderServiceStatusBase(snapshot: StateSnapshot, stats: DailyStatsData, config: ServiceConfiguration) {
  const response: JsonResponse = {
    Status: getStatusText(snapshot),
    Timestamp: new Date().toISOString(),
    Payload: {
      Uptime: getCurrentClockTime() - timeOriginallyLaunched,
      MemoryUsage: process.memoryUsage(),
      Version: {
        Semantic: snapshot.CurrentVersion,
      },
      CurrentRefTime: snapshot.CurrentRefTime,
      CurrentRefBlock: snapshot.CurrentRefBlock,
      EventsStats: snapshot.EventsStats,
      CurrentCommittee: snapshot.CurrentCommittee,
      CurrentCandidates: snapshot.CurrentCandidates,
      CurrentTopology: snapshot.CurrentTopology,
      CurrentImageVersions: snapshot.CurrentImageVersions,
      CurrentImageVersionsUpdater: snapshot.CurrentImageVersionsUpdater,
      CurrentVirtualChains: snapshot.CurrentVirtualChains,
      ProtocolVersionEvents: snapshot.ProtocolVersionEvents,
      CurrentContractAddress: snapshot.CurrentContractAddress,
      ContractAddressChanges: snapshot.ContractAddressChanges,
      Participation30Days: getParticipation(snapshot, 30 * 24 * 60 * 60),
      Guardians: _.mapValues(snapshot.CurrentOrbsAddress, (OrbsAddress, EthAddress) => {
        return {
          EthAddress,
          OrbsAddress,
          Ip: snapshot.CurrentIp[EthAddress],
          EffectiveStake: snapshot.CurrentEffectiveStake[EthAddress] ?? 0,
          SelfStake: snapshot.CurrentDetailedStake[EthAddress]?.SelfStake ?? 0,
          DelegatedStake: snapshot.CurrentDetailedStake[EthAddress]?.DelegatedStake ?? 0,
          ElectionsStatus: snapshot.CurrentElectionsStatus[EthAddress],
          IdentityType: snapshot.CurrentCertification[EthAddress] ? 1 : 0,
          ...snapshot.CurrentRegistrationData[EthAddress],
        };
      }),
      EthereumRequestStats: stats,
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
  res.push(`RefBlock = ${snapshot.CurrentRefBlock}`);
  res.push(`TotalEventsProcessed = ${snapshot.EventsStats.TotalEventsProcessed}`);
  res.push(`committee size = ${snapshot.CurrentCommittee.length}`);
  res.push(`stable node = ${snapshot.CurrentImageVersions['main']['node']}\n`);
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
