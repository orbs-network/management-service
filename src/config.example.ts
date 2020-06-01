import { ServiceConfiguration } from './data-types';

export const exampleConfig: ServiceConfiguration = {
    Port: 8080,
    EthereumGenesisContract: '0x5cd0D270C30EDa5ADa6b45a5289AFF1D425759b3',
    EthereumEndpoint: 'http://ganache:7545',
    DockerNamespace: 'orbsnetwork',
    DockerHubPollIntervalSeconds: 1,
    EthereumPollIntervalSeconds: 1,
    FinalityBufferBlocks: 10,
    FirstBlock: 0,
    verbose: false,
    boyarLegacyBootstrap: 'http://static:80/legacy-boyar.json',
};
