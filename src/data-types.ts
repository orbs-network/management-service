import validate from 'validate.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ABI = any;

export interface ServiceConfiguration {
    Port: number;
    EthereumGenesisContract: string;
    EthereumEndpoint: string;
    DockerNamespace: string;
    DockerHubPollIntervalSeconds: number;
    EthereumPollIntervalSeconds: number;
    FinalityBufferBlocks: number;
    FirstBlock: number;
    verbose: boolean;
}

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
        verbose: {
            presence: { allowEmpty: false },
            type: 'boolean',
        },
    };
    return validate(c, serviceConfigConstraints, { format: 'flat' });
}

export type DockerConfig = {
    ContainerNamePrefix?: string;
    Image: string;
    Tag: string;
    Pull?: boolean;
    Resources?: {
        Limits?: {
            Memory?: number;
            CPUs?: number;
        };
        Reservations?: {
            Memory?: number;
            CPUs?: number;
        };
    };
};

export type ChainConfiguration = {
    Id: string | number;
    InternalPort: number; // for gossip, identical for all vchains
    ExternalPort: number; // for gossip, different for all vchains
    InternalHttpPort: number; // identical for all vchains
    DockerConfig: DockerConfig;
    Config: {
        ManagementConfigUrl: string; //`http://management-service/vchains/${vcid}/management`;
        SignerUrl: string; //'http://signer:7777';
        'ethereum-endpoint': string; //'http://eth.orbs.com'; // eventually rename to EthereumEndpoint
    };
};

export type ErrorResponse = {
    error: string;
    stack?: string | undefined;
    status: 'error';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isErrorResponse(res: any): res is ErrorResponse {
    return res && res.status === 'error';
}
