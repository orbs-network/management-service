/*
Version Tagging Conventions

v{PROTOCOL}.{MINOR}.{PATCH}[-canary][-hotfix]

{PROTOCOL} indicates the latest supported protocol version. Can be any non-negative integer (0 and above). Note that when a new protocol version is released, not all services are necessarily released so some services might remain with latest versions tagged with a previous protocol version.

{MINOR} indicates the changes in functionality according to semver semantics. It must increase monotonically within the same protocol. It can be any non-negative integer (0 and above).

{PATCH} indicates changes in implementation according to semver semantics. It must increase monotonically within the same protocol. It can be any non-negative integer (0 and above).

-canary is an optional segment that indicates the canary rollout group. If given, this is not a GA version but rather a canary version that should only be rolled out to canary virtual chains.

-hotfix is an optional segment that indicates that this version should be applied faster than normal. Normal gradual rollout takes place over 24h, versions marked as hotflix roll out over 1h.

-immediate is an optional segment that indicates that this version should be applied immediately without any delays.

The latest available version according to semver semantics will be deployed.

Examples of valid versions:
anything may come here:v1.2.3
domain.com:444/myorg/node:v1.2.3-hotfix
v1.2.3-canary
v1.2.3-canary-hotfix
v1.2.3-immediate
v1.2.3-canary-immediate

Notes:
The v prefix is mandatory and has to be lower case.

regex reference : // https://regex101.com/r/Ly7O1x/310
*/
const FULL_REGULAR_EXPRESSION =
  /(?<imageName>.+):(?<tag>v(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(-(?<deploymentSubset>canary))?(-(?<rolloutWindow>hotfix|immediate))?)$/m;

// TODO check that the image name part is well formed, not just the tag
export function isValid(src: string): boolean {
  return FULL_REGULAR_EXPRESSION.test(src);
}

export function isHotfix(src: string): boolean {
  const parsed: any = FULL_REGULAR_EXPRESSION.exec(src);
  if (!parsed) {
    return false;
  }
  return parsed.groups['rolloutWindow'] === 'hotfix';
}

export function isCanary(src: string): boolean {
  const parsed: any = FULL_REGULAR_EXPRESSION.exec(src);
  if (!parsed) {
    return false;
  }
  return parsed.groups['deploymentSubset'] === 'canary';
}

export function isImmediate(src: string): boolean {
  const parsed: any = FULL_REGULAR_EXPRESSION.exec(src);
  if (!parsed) {
    return false;
  }
  return parsed.groups['rolloutWindow'] === 'immediate';
}

export function parseImageTag(src: string): undefined | { Image: string; Tag: string } {
  const parsed: any = FULL_REGULAR_EXPRESSION.exec(src);
  if (!parsed) return undefined;

  return {
    Image: parsed.groups['imageName'],
    Tag: parsed.groups['tag'],
  };
}

export function compare(a: string, b: string): number {
  const aResult: any = FULL_REGULAR_EXPRESSION.exec(a);
  if (!aResult) {
    return -1;
  }
  const bResult: any = FULL_REGULAR_EXPRESSION.exec(b);
  if (!bResult) {
    return 1;
  }
  const aNumbers = [aResult.groups.major, aResult.groups.minor, aResult.groups.patch].map((n) => Number(n));
  const bNumbers = [bResult.groups.major, bResult.groups.minor, bResult.groups.patch].map((n) => Number(n));

  for (let i = 0; i < 3; i++) {
    if (aNumbers[i] === bNumbers[i]) {
      continue;
    } else if (aNumbers[i] > bNumbers[i]) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
}
