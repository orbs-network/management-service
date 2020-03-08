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

export type DockerConfig = {
    ContainerNamePrefix?: string;
    Image: string;
    Tag: string;
    Pull?: boolean;
};

export type LegacyBoyarBootstrap = {
    network: Array<unknown>;
    orchestrator: {
        'storage-driver': string;
        'max-reload-time-delay': string;
    };
    chains: Array<{
        Id: string | number;
        HttpPort: number;
        GossipPort: number;
        DockerConfig: DockerConfig;
        Config: object;
    }>;
};
