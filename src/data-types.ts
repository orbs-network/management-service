import validate from 'validate.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ABI = any;

export interface ServiceConfiguration {
    Port: number;
    EthereumGenesisContract: string;
    EthereumEndpoint: string;
    FirstBlock: string | number;
    // EthereumNetwork: EthereumNetwork;
    boyarLegacyBootstrap: string;
    pollIntervalSeconds: number;
    DockerNamespace: string;
    finalityBufferBlocks: number;
    verbose: boolean;
}

// export type EthereumNetwork = 'ganache' | 'mainnet' | 'ropsten';

export function validateServiceConfiguration(c: Partial<ServiceConfiguration>): string[] | undefined {
    const serviceConfigConstraints = {
        boyarLegacyBootstrap: {
            presence: { allowEmpty: false },
            type: 'string',
        },
        pollIntervalSeconds: {
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
        finalityBufferBlocks: {
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

export type LegacyBoyarBootstrapInput = {
    network?: Array<unknown>;
    orchestrator: {
        [name: string]: string;
    };
    chains: Array<ChainConfiguration>;
    services: { [name: string]: unknown };
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

export interface GenericNodeService {
    InternalPort: number;
    ExternalPort?: number;
    DockerConfig: DockerConfig;
    Config: object;
}

export type IdentityType = 0;
export interface ManagementNodeService extends GenericNodeService {
    DockerConfig: DockerConfig;
    Config: ServiceConfiguration;
}
export type CommitteeElement = {
    EthAddress: string;
    OrbsAddress: string;
    EffectiveStake: number;
    IdentityType: IdentityType;
};
export type CommitteeEvent = {
    RefTime: number;
    Committee: Array<CommitteeElement>;
};
export type SubscriptionEvent = {
    RefTime: number;
    Data: {
        Status: string;
        Tier: string;
        RolloutGroup: string;
        IdentityType: IdentityType;
        Params: object;
    };
};
export type ProtocolVersionEvent = {
    RefTime: number;
    Data: {
        RolloutGroup: string;
        Version: number;
    };
};
export type TopologyElement = {
    OrbsAddress: string;
    Ip: string;
    Port: number;
};

export type VirtualChainConfigurationOutput = {
    CurrentRefTime: number;
    PageStartRefTime: number;
    PageEndRefTime: number;
    VirtualChains: {
        [VirtualChainId: string]: {
            VirtualChainId: string;
            CurrentTopology: Array<TopologyElement>;
            CommitteeEvents: Array<CommitteeEvent>;
            SubscriptionEvents: Array<SubscriptionEvent>;
            ProtocolVersionEvents: Array<ProtocolVersionEvent>;
        };
    };
};

export type NodeManagementConfigurationOutput = {
    network: LegacyBoyarBootstrapInput['network'];
    orchestrator: {
        [name: string]: string | object;
        DynamicManagementConfig: {
            Url: string;
            ReadInterval: string;
            ResetTimeout: string;
        };
    };
    chains: Array<ChainConfiguration>;
    services: {
        [name: string]: GenericNodeService;
        'management-service': ManagementNodeService;
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
