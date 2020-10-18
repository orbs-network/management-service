import { ServiceConfiguration } from './config';

export const exampleConfig: ServiceConfiguration = {
  BootstrapMode: false,
  Port: 8080,
  EthereumGenesisContract: '0x5454223e3078Db87e55a15bE541cc925f3702eB0',
  EthereumFirstBlock: 11050000,
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
  Verbose: false,
  'node-address': 'ecfcccbc1e54852337298c7e90f5ecee79439e67',
};
