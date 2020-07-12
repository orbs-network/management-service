import validate from 'validate.js';

export interface ServiceConfiguration {
  Port: number;
  EthereumGenesisContract: string;
  EthereumEndpoint: string;
  DockerNamespace: string;
  DockerRegistry: string;
  DockerHubPollIntervalSeconds: number;
  RegularRolloutWindowSeconds: number;
  HotfixRolloutWindowSeconds: number;
  EthereumPollIntervalSeconds: number;
  ElectionsStaleUpdateSeconds: number;
  FinalityBufferBlocks: number;
  EthereumFirstBlock: number;
  Verbose: boolean;
  'node-address': string;
}

export const defaultServiceConfiguration: Partial<ServiceConfiguration> = {
  Port: 8080,
  // TODO: add EthereumGenesisContract with default mainnet address
  DockerNamespace: 'orbsnetwork',
  DockerRegistry: 'https://registry.hub.docker.com',
  DockerHubPollIntervalSeconds: 3 * 60,
  RegularRolloutWindowSeconds: 24 * 60 * 60,
  HotfixRolloutWindowSeconds: 60 * 60,
  EthereumPollIntervalSeconds: 30,
  ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
  EthereumFirstBlock: 0,
  FinalityBufferBlocks: 40,
  Verbose: false,
};

export function validateServiceConfiguration(c: Partial<ServiceConfiguration>): string[] | undefined {
  const serviceConfigConstraints = {
    EthereumPollIntervalSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    ElectionsStaleUpdateSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    DockerHubPollIntervalSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    RegularRolloutWindowSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    HotfixRolloutWindowSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    Port: {
      presence: { allowEmpty: false },
      type: 'integer',
      numericality: { noStrings: true },
    },
    EthereumEndpoint: {
      presence: { allowEmpty: false },
      type: 'string',
      url: {
        allowLocal: true,
      },
    },
    EthereumGenesisContract: {
      presence: { allowEmpty: false },
      type: 'string',
    },
    FinalityBufferBlocks: {
      presence: { allowEmpty: false },
      type: 'integer',
      numericality: { noStrings: true },
    },
    DockerNamespace: {
      presence: { allowEmpty: false },
      type: 'string',
    },
    DockerRegistry: {
      presence: { allowEmpty: false },
      type: 'string',
    },
    Verbose: {
      presence: { allowEmpty: false },
      type: 'boolean',
    },
    'node-address': {
      presence: { allowEmpty: false },
      type: 'string',
    },
  };
  return validate(c, serviceConfigConstraints, { format: 'flat' });
}
