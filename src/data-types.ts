export interface ServiceConfiguration {
    Port: number;
    EthereumGenesisContract: string;
    EthereumEndpoint: string;
    // EthereumNetwork: EthereumNetwork;
    boyarLegacyBootstrap: string;
    pollIntervalSeconds: number;
}

// export type EthereumNetwork = 'ganache' | 'mainnet' | 'ropsten';

export function isLegalServiceConfiguration(c: Partial<ServiceConfiguration>): c is ServiceConfiguration {
    return (
        !!c &&
        typeof c.boyarLegacyBootstrap === 'string' &&
        typeof c.pollIntervalSeconds == 'number' &&
        !Number.isNaN(c.pollIntervalSeconds) &&
        typeof c.Port == 'number' &&
        !Number.isNaN(c.Port) &&
        typeof c.EthereumEndpoint == 'string' &&
        typeof c.EthereumGenesisContract == 'string'
        // typeof c.EthereumNetwork == 'string' &&
        // ['ganache', 'mainnet', 'ropsten'].includes(c.EthereumNetwork)
    );
}

export type DockerConfig<I extends string = string> = {
    ContainerNamePrefix?: string;
    Image: I;
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
        ManagementConfigUrl: string; //'http://1.1.1.1/vchains/42/management';
        SignerUrl: string; //'http://1.1.1.1/signer';
        'ethereum-endpoint': string; //'http://localhost:8545'; // eventually rename to EthereumEndpoint
    };
};

export interface GenericNodeService {
    InternalPort: number;
    ExternalPort: number;
    DockerConfig: DockerConfig;
    Config: object;
}

export type IdentityType = 0;
export interface ManagementNodeService extends GenericNodeService {
    DockerConfig: DockerConfig<'orbsnetwork/management-service'>;
    Config: ServiceConfiguration;
}
export type CommitteeElement = {
    EthAddress: string;
    OrbsAddress: string;
    EffectiveStake: 16578435;
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
