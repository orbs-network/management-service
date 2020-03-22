import { Driver } from '@orbs-network/orbs-ethereum-contracts-v2';
import nock from 'nock';

export function getAddresses(driver: Driver) {
    return {
        Subscriptions: driver.subscriptions.web3Contract.options.address
    };
}
export function nockDockerHub(...repositories: { user: string; name: string; tags: string[] }[]) {
    nock(/docker/); // prevent requests to docker domain from goinig to network
    nock('https://auth.docker.io') // allow asking for token from auth
        .get(/token/)
        .times(repositories.length) // once per repo
        .reply(200, { token: 'token placeholder' });

    let registryScope = nock('https://registry.hub.docker.com'); // expect polling tags list
    for (const repository of repositories) {
        registryScope = registryScope
            .get(`/v2/${repository.user}/${repository.name}/tags/list`) // for each repo
            .reply(200, { tags: repository.tags });
    }
    return registryScope;
}

export function nockBoyarConfig() {
    const congigUri = 'https://s3.amazonaws.com';
    const configPath = '/orbs-bootstrap-prod/boyar/config.json';
    const extraConfig = 'hello world';
    const body: object = {
        extraConfig,
        services: {
            'management-service': {
                Config: { extraConfig }
            }
        }
    };
    const scope = nock(congigUri)
        .get(configPath)
        .reply(200, body);
    return { scope, congigUri, configPath, extraConfig };
}
