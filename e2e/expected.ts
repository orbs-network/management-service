import { getVirtualChainPort } from '../src/ports';
/*
Below is the expected behaviour of the management service in the E2E test.
The goal is to keep the expectations as static as reasonably possible, to help readability.
The dynamic parts are:
 - the number of virtual chains to match
 - the `Id` and `ExternalPort` properties of virtual chain configurations
 - the configuration of the management service itself (determined by test fixture)
current format is based on example from:
https://raw.githubusercontent.com/orbs-network/orbs-spec/master/config-examples/node-management.json
*/

/**
 * @param appConfig actual E2E fixture settings
 */
export function getExpected(appConfig: object, vChainIds: string[]) {
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
        chains: vChainIds.map(getExpectedVirtualChainConfiguration),
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

function getExpectedVirtualChainConfiguration(vcid: string) {
    return {
        Config: {
            ManagementConfigUrl: 'http://1.1.1.1/vchains/42/management',
            SignerUrl: 'http://1.1.1.1/signer',
            'ethereum-endpoint': 'http://localhost:8545'
        },
        DockerConfig: {
            Image: 'orbsnetwork/node',
            Resources: {
                Limits: {
                    CPUs: 1,
                    Memory: 1024
                },
                Reservations: {
                    CPUs: 0.5,
                    Memory: 512
                }
            },
            Tag: 'G-0-N'
        },
        ExternalPort: getVirtualChainPort(vcid),
        Id: vcid,
        InternalHttpPort: 8080,
        InternalPort: 4400
    };
}
