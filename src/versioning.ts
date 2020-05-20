/*
Version Tagging Conventions

v{PROTOCOL}.{MINOR}.{PATCH}[-canary][+hotfix]

{PROTOCOL} indicates the latest supported protocol version. Can be any non-negative integer (0 and above). Note that when a new protocol version is released, not all services are necessarily released so some services might remain with latest versions tagged with a previous protocol version.
 
{MINOR} indicates the changes in functionality according to semver semantics. It must increase monotonically within the same protocol. It can be any non-negative integer (0 and above).
 
{PATCH} indicates changes in implementation according to semver semantics. It must increase monotonically within the same protocol. It can be any non-negative integer (0 and above).
 
-canary is an optional segment that indicates the canary rollout group. If given, this is not a GA version but rather a canary version that should only be rolled out to canary virtual chains.
 
+hotfix is an optional segment that indicates that this version should be applied faster than normal. Normal gradual rollout takes place over 24h, versions marked as hotflix roll out over 1h.
 
The latest available version according to semver semantics will be deployed.
 
Examples of valid versions:
v1.2.3
v1.2.3+hotfix
v1.2.3-canary
v1.2.3-canary+hotfix
 
Notes:
The v prefix is mandatory and has to be lower case.

regex reference : // https://regex101.com/r/Ly7O1x/310
*/

const REGULAR_EXPRESSION = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-canary)?(\+hotfix)?$/m;

export function isValid(src: string): boolean {
    return REGULAR_EXPRESSION.test(src);
}

export function compare(a: string, b: string): number {
    if (!isValid(a)) {
        return -1;
    }
    if (!isValid(b)) {
        return 1;
    }
    // lex sort is enough
    return a.localeCompare(b);
}
