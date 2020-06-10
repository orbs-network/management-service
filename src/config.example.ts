import { ServiceConfiguration } from './config';

export const exampleConfig: ServiceConfiguration = {
  Port: 8080,
  EthereumGenesisContract: '0x5cd0D270C30EDa5ADa6b45a5289AFF1D425759b3',
  EthereumEndpoint: 'http://ganache:7545',
  DockerNamespace: 'orbsnetwork',
  DockerRegistry: 'https://registry.hub.docker.com',
  DockerHubPollIntervalSeconds: 1,
  RegularRolloutWindow: 5,
  HotfixRolloutWindow: 1,
  EthereumPollIntervalSeconds: 1,
  FinalityBufferBlocks: 10,
  FirstBlock: 0,
  Verbose: false,
};
