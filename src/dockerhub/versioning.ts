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

const REGULAR_EXPRESSION = /v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-canary)?(-hotfix|-immediate)?$/m;
const HOTFIX_REGULAR_EXPRESSION = /v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-canary)?-hotfix$/m;
const IMMEDIATE_REGULAR_EXPRESSION = /v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-canary)?-immediate$/m;

// TODO check that the image name part is well formed, not just the tag
export function isValid(src: string): boolean {
  const result = REGULAR_EXPRESSION.exec(src);
  if (!result) {
    return false;
  }

  if (result.index === 0) {
    return true;
  }

  return src.charAt(result.index - 1) === ':'; // the legal delimiter between image and tag
}

export function isHotfix(src: string): boolean {
  return HOTFIX_REGULAR_EXPRESSION.test(src);
}

export function isImmediate(src: string): boolean {
  return IMMEDIATE_REGULAR_EXPRESSION.test(src);
}

export function parseImageTag(src: string): { Image: string; Tag: string } {
  const result = REGULAR_EXPRESSION.exec(src);

  if (!result) {
    throw new Error('Invalid version tag');
  }

  if (result.index === 0) {
    return {
      Image: '',
      Tag: src,
    };
  }

  if (result.index === 1) {
    if (src.startsWith(':')) {
      return {
        Image: '',
        Tag: src.slice(1),
      };
    }
    throw new Error('Invalid Image name');
  }

  return {
    Image: src.slice(0, result.index - 1),
    Tag: src.slice(result.index),
  };
}

export function compare(a: string, b: string): number {
  const aResult = REGULAR_EXPRESSION.exec(a);
  if (!aResult) {
    return -1;
  }
  const bResult = REGULAR_EXPRESSION.exec(b);
  if (!bResult) {
    return 1;
  }
  for (let i = 1; i <= 3; ++i) {
    if (aResult[i] === bResult[i]) {
      continue;
    } else if (Number(aResult[i]) > Number(bResult[i])) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
}
