import nock from 'nock';
import { isArray, isEqual } from 'lodash/fp';
import { isFunction, isRegExp, isString } from 'util';

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
                Config: { extraConfig },
            },
        },
    };
    const scope = nock(congigUri).get(configPath).reply(200, body);
    return { scope, congigUri, configPath, extraConfig };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepDataMatcher(data: any, pattern: any, path = 'ROOT'): string[] {
    const errors = [] as string[];
    if (typeof pattern == 'object' && pattern && data) {
        // either object or array
        for (const key in pattern) {
            if (!`${key}`.startsWith('_')) {
                // ignore private properties
                const current = data[key];
                const should = pattern[key];
                const propertyPath = isArray(pattern) ? `${path}[${key}]` : `${path}.${key}`;
                if (isRegExp(should)) {
                    (isString(current) && should.test(current)) ||
                        errors.push(`${propertyPath} : ${JSON.stringify(current)} does not satisfy ${should} `);
                } else if (isFunction(should)) {
                    should(current) ||
                        errors.push(`${propertyPath} : ${JSON.stringify(current)} does not satisfy matcher ${should} `);
                } else if (isArray(should) && !isArray(current)) {
                    errors.push(`${propertyPath} : ${JSON.stringify(current)} is not an array`);
                } else {
                    errors.push(...deepDataMatcher(current, should, propertyPath));
                }
            }
        }
    } else {
        isEqual(data, pattern) ||
            errors.push(`${path} : ${JSON.stringify(data)}  expected: ${JSON.stringify(pattern)}`);
    }
    return errors;
}
