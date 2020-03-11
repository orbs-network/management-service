export interface ServiceConfiguration {
    boyarLegacyBootstrap: string;
    pollIntervalSeconds: number;
}
export function isLegalServiceConfiguration(c: Partial<ServiceConfiguration>): c is ServiceConfiguration {
    return (
        !!c &&
        typeof c.boyarLegacyBootstrap === 'string' &&
        typeof c.pollIntervalSeconds == 'number' &&
        !Number.isNaN(c.pollIntervalSeconds)
    );
}

export type DockerConfig<I extends string = string> = {
    ContainerNamePrefix?: string;
    Image: I;
    Tag: string;
    Pull?: boolean;
};

export type LegacyBoyarBootstrapInput = {
    network?: Array<unknown>;
    orchestrator: {
        [name: string]: string;
    };
    chains: Array<ChainConfiguration>;
};

export type ChainConfiguration = {
    Id: string | number;
    HttpPort: number;
    GossipPort: number;
    DockerConfig: DockerConfig;
    Config: object;
};

export interface GenericNodeService {
    Port: number;
    ExternalPort: number;
    DockerConfig: DockerConfig;
    Config: object;
}
export interface ManagementNodeService extends GenericNodeService {
    DockerConfig: DockerConfig<'orbsnetwork/management-service'>;
    Config: ServiceConfiguration;
}

export type BoyarConfigurationOutput = {
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
