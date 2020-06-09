import validate from 'validate.js';

export interface ServiceConfiguration {
  Port: number;
  EthereumGenesisContract: string;
  EthereumEndpoint: string;
  DockerNamespace: string;
  DockerHubPollIntervalSeconds: number;
  RegularRolloutWindow: number;
  HotfixRolloutWindow: number;
  EthereumPollIntervalSeconds: number;
  FinalityBufferBlocks: number;
  FirstBlock: number;
  Verbose: boolean;
}

export const defaultServiceConfiguration: Partial<ServiceConfiguration> = {
  Port: 8080,
  // TODO: add EthereumGenesisContract with default mainnet address
  DockerNamespace: 'orbsnetwork',
  DockerHubPollIntervalSeconds: 3 * 60,
  RegularRolloutWindow: 24 * 60 * 60,
  HotfixRolloutWindow: 60 * 60,
  EthereumPollIntervalSeconds: 30,
  FirstBlock: 0,
  FinalityBufferBlocks: 100,
  Verbose: false,
};

export function validateServiceConfiguration(c: Partial<ServiceConfiguration>): string[] | undefined {
  const serviceConfigConstraints = {
    EthereumPollIntervalSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    DockerHubPollIntervalSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    RegularRolloutWindow: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    HotfixRolloutWindow: {
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
    Verbose: {
      presence: { allowEmpty: false },
      type: 'boolean',
    },
  };
  return validate(c, serviceConfigConstraints, { format: 'flat' });
}
