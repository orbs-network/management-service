import _ from 'lodash';
import { StateSnapshot } from '../model/state';
import { ServiceConfiguration } from '../config';
import { getVirtualChainPort } from './helpers';

export function getNodeManagement(snapshot: StateSnapshot, config: ServiceConfiguration) {
  // make sure we have all service image versions
  for (const imageName of ['node', 'management-service']) {
    if (!snapshot.CurrentImageVersions[imageName]) {
      throw new Error(`Could not find image version for '${imageName}'.`);
    }
  }

  return {
    network: [],
    orchestrator: {
      DynamicManagementConfig: {
        Url: 'http://localhost:7666/node/management',
        ReadInterval: '30s',
        ResetTimeout: '30m',
      },
      'storage-driver': 'local',
      'storage-mount-type': 'bind',
    },
    services: {
      signer: {
        InternalPort: 7777,
        DockerConfig: {
          Image: 'orbsnetwork/signer', // TODO: what's the spec for signer location?
          Tag: 'experimental', // TODO: what's the spec for the signer version?
          Pull: true, // TODO: should signer be pull false?
        },
        Config: {
          api: 'v1',
        },
      },
      'management-service': {
        InternalPort: 8080,
        ExternalPort: 7666,
        DockerConfig: {
          Image: `${config.DockerNamespace}/management-service`,
          Tag: snapshot.CurrentImageVersions['management-service'],
          Pull: true,
        },
        Config: config, // forward my own input config + defaults for what's missing
      },
    },
    chains: Object.keys(snapshot.CurrentVirtualChains).map((vcId) => getChain(parseInt(vcId), snapshot, config)),
  };
}

function getChain(vchainId: number, snapshot: StateSnapshot, config: ServiceConfiguration) {
  return {
    Id: vchainId,
    InternalPort: 4400,
    ExternalPort: getVirtualChainPort(vchainId),
    InternalHttpPort: 8080,
    Disabled: false,
    DockerConfig: {
      Image: `${config.DockerNamespace}/node`,
      Tag: snapshot.CurrentImageVersions['node'],
      Pull: true,
    },
    Config: {
      'management-file-path': `http://management-service:8080/vchains/${vchainId}/management`,
      'signer-endpoint': 'http://signer:7777',
      'ethereum-endpoint': config.EthereumEndpoint,
      'active-consensus-algo': 2,
      'lean-helix-show-debug': true,
      'consensus-context-triggers-enabled': true,
      'transaction-pool-time-between-empty-blocks': '9s',
      'lean-helix-consensus-round-timeout-interval': '14s',
      'block-sync-no-commit-interval': '18s',
      'consensus-context-system-timestamp-allowed-jitter': '1m',
      'logger-file-truncation-interval': '4h',
      profiling: true,
    },
  };
}
