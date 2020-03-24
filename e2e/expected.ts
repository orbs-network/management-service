/**
 * @param appConfig actual E2E fixture settings
 */
export function getExpected(appConfig: object) {
    return {
        network: [],
        orchestrator: {
            DynamicManagementConfig: {
                ReadInterval: '1m',
                ResetTimeout: '30m',
                Url: 'http:/localhost:7666/node/management'
            },
            'storage-driver': 'nfs',
            'storage-options': {
                maxRetries: '10'
            }
        },
        chains: [],
        services: {
            'management-service': {
                InternalPort: 8080,
                ExternalPort: 7666,
                DockerConfig: {
                    Image: 'orbsnetwork/management-service',
                    Tag: 'G-0-N',
                    Pull: true
                },
                Config: appConfig
            }
        }
    };
}
