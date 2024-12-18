import validate from 'validate.js';

export interface ServiceConfiguration {
  BootstrapMode: boolean;
  Port: number;
  EthereumGenesisContract: string;
  EthereumEndpoint: string[];
  /** @deprecated Use `EthereumEndpoint` instead */
  MaticEndpoint?: string;
  DeploymentDescriptorUrl: string;
  ElectionsAuditOnly: boolean;
  StatusJsonPath: string;
  StatusAnalyticsJsonPath: string;
  StatusAnalyticsJsonGzipPath: string;
  StatusWriteIntervalSeconds: number;
  DeploymentDescriptorPollIntervalSeconds: number;
  RegularRolloutWindowSeconds: number;
  HotfixRolloutWindowSeconds: number;
  EthereumPollIntervalSeconds: number;
  EthereumRequestsPerSecondLimit: number;
  ElectionsStaleUpdateSeconds: number;
  FinalityBufferBlocks: number;
  EthereumFirstBlock: number;
  Verbose: boolean;
  'node-address': string;
  ExternalLaunchConfig: { [key: string]: unknown };
}

export const defaultServiceConfiguration = {
  BootstrapMode: false,
  Port: 8080,
  EthereumGenesisContract: '0xD859701C81119aB12A1e62AF6270aD2AE05c7AB3',
  EthereumFirstBlock: 11191390,
  DeploymentDescriptorUrl: 'https://deployment.orbs.network/mainnet.json',
  ElectionsAuditOnly: false,
  StatusJsonPath: './status/status.json',
  StatusAnalyticsJsonPath: './status/analytics.json',
  StatusAnalyticsJsonGzipPath: './status/analytics.json.gz',
  StatusWriteIntervalSeconds: 25,
  DeploymentDescriptorPollIntervalSeconds: 3 * 60,
  RegularRolloutWindowSeconds: 24 * 60 * 60,
  HotfixRolloutWindowSeconds: 60 * 60,
  EthereumPollIntervalSeconds: 30,
  EthereumRequestsPerSecondLimit: 0,
  ElectionsStaleUpdateSeconds: 7 * 24 * 60 * 60,
  FinalityBufferBlocks: 40,
  Verbose: false,
};

// Define the types for the custom validator function
validate.validators.array = function (
  value: unknown,
  options: { item?: validate.ValidateOption },
  key: string
): string | undefined {
  // Check if the value is an array
  if (!Array.isArray(value)) {
    return `${key} must be an array.`;
  }

  // If there are item-level validation options, validate each item
  if (options && options.item) {
    const errors = value
      .map((item, index) => {
        const error = validate.single(item, options.item);
        if (error) {
          return `Item ${index + 1}: ${error.join(', ')}`;
        }
        return undefined;
      })
      .filter((error): error is string => !!error); // Narrow the type to strings

    // If there are errors, return them as a single string
    if (errors.length > 0) {
      return errors.join('; ');
    }
  }

  // Return undefined if there are no errors
  return undefined;
};

export function validateServiceConfiguration(c: Partial<ServiceConfiguration>): string[] | undefined {
  const serviceConfigConstraints = {
    BootstrapMode: {
      presence: { allowEmpty: false },
      type: 'boolean',
    },
    EthereumPollIntervalSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    EthereumRequestsPerSecondLimit: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    DeploymentDescriptorUrl: {
      presence: { allowEmpty: false },
      type: 'string',
      url: {
        allowLocal: true,
      },
    },
    ElectionsStaleUpdateSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    StatusWriteIntervalSeconds: {
      presence: { allowEmpty: false },
      type: 'number',
      numericality: { noStrings: true },
    },
    DeploymentDescriptorPollIntervalSeconds: {
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
    presence: true, // Ensure the attribute is present
    type: "array",  // Ensure it's an array
    array: {
      item: {
        presence: true, // Ensure each item is not empty
        type: "string", // Ensure each item in the array is a string
        format: {
          pattern: /^(https?:\/\/[^\s$.?#].[^\s]*)$/i, // URL regex pattern
          message: "must be a valid URL"
        }
      }
    }
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
    ElectionsAuditOnly: {
      presence: { allowEmpty: false },
      type: 'boolean',
    },
    StatusJsonPath: {
      presence: { allowEmpty: false },
      type: 'string',
    },
    StatusAnalyticsJsonPath: {
      presence: { allowEmpty: false },
      type: 'string',
    },
    StatusAnalyticsJsonGzipPath: {
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
