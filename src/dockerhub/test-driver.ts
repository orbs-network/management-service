import nock from 'nock';

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
