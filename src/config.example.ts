import { ServiceConfiguration } from './config';

export const exampleConfig: ServiceConfiguration = {
  BootstrapMode: false,
  Port: 8080,
  EthereumGenesisContract: '0x5cd0D270C30EDa5ADa6b45a5289AFF1D425759b3',
  EthereumEndpoint: 'http://ganache:7545',
  DockerNamespace: 'orbsnetwork',
  DockerRegistry: 'https://registry.hub.docker.com',
  DockerHubPollIntervalSeconds: 1,
  RegularRolloutWindowSeconds: 5,
  HotfixRolloutWindowSeconds: 1,
  EthereumPollIntervalSeconds: 1,
  EthereumRequestsPerSecondLimit: 0,
  ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
  FinalityBufferBlocks: 10,
  EthereumFirstBlock: 0,
  Verbose: false,
  'node-address': '16fcf728f8dc3f687132f2157d8379c021a08c12',
};
