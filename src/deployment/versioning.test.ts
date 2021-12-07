import test from 'ava';
import { isValid, compare, isHotfix, isImmediate, parseImageTag } from './versioning';

test('isValid returns true on valid versions', (t) => {
  const validTags = [
    'myhub.com/myorg/node:v0.0.0',
    'myhub.com/myorg/node:v1.22.333',
    'myhub.com/myorg/node:v0.0.0-canary',
    'myhub.com/myorg/node:v0.0.0-hotfix',
    'myhub.com/myorg/node:v1.22.333-hotfix',
    'myhub.com/myorg/node:v0.0.0-canary-hotfix',
    'myhub.com/myorg/node:v0.0.0-immediate',
    'myhub.com/myorg/node:v1.22.333-immediate',
    'myhub.com/myorg/node:v0.0.0-canary-immediate',
    'foo:999/bar:v0.0.0',
    'foo:999/bar:v1.22.333',
    'foo:999/bar:v0.0.0-canary',
    'foo:999/bar:v0.0.0-hotfix',
    'foo:999/bar:v1.22.333-hotfix',
    'foo:999/bar:v0.0.0-canary-hotfix',
    'foo:999/bar:v0.0.0-immediate',
    'foo/bar:v1.22.333-immediate',
    'foo/bar:v0.0.0-canary-immediate',
    'a:v0.0.0',
    'a:v1.22.333',
    'a:v0.0.0-canary',
    'a:v0.0.0-hotfix',
    'a:v1.22.333-hotfix',
    'a:v0.0.0-canary-hotfix',
    'a:v0.0.0-immediate',
    'a:v1.22.333-immediate',
    'a:v0.0.0-canary-immediate',
  ];
  for (const tag of validTags) {
    t.true(isValid(tag), tag);
  }
});

test('isHotfix returns true on valid versions', (t) => {
  const validTags = ['a:v0.0.0-hotfix', 'a:v1.22.333-hotfix', 'a:v0.0.0-canary-hotfix'];
  for (const tag of validTags) {
    t.true(isHotfix(tag), tag);
  }
});

test('isImmediate returns true on valid versions', (t) => {
  const validTags = ['a:v0.0.0-immediate', 'a:v1.22.333-immediate', 'a:v0.0.0-canary-immediate'];
  for (const tag of validTags) {
    t.true(isImmediate(tag), tag);
  }
});

test('isValid returns false on invalid versions', (t) => {
  const invalidTags = [
    'G-0-H',
    'C-0-N',
    '0.0.0',
    'v0.0.0 foo',
    'foo v0.0.0',
    'v0.0',
    'v0.0.',
    'v0.0.0 -canary',
    'v0.0.0-canar y',
    'v01.22.333',
    'v0.0.0-ferrary',
    'v0.0.0-ferrary+slow',
    'v1.3.13-cc1cc788',
    'v1.2.3-hotfix-immediate',
    'v1.2.3-immediate-hotfix',
    'v1.2.3-hotfix-hotfix',
    'v1.2.3-immediate-immediate',
    'foo:999/bar:G-0-H',
    'foo:999/bar:C-0-N',
    'foo:999/bar:0.0.0',
    'foo:999/bar:v0.0.0 foo',
    'foo:999/bar:foo v0.0.0',
    'foo:999/bar:v0.0',
    'foo:999/bar:v0.0.',
    'foo:999/bar:v0.0.0 -canary',
    'foo:999/bar:v0.0.0-canar y',
    'foo:999/bar:v01.22.333',
    'foo:999/bar:v0.0.0-ferrary',
    'foo:999/bar:v0.0.0-ferrary+slow',
    'foo:999/bar:v1.3.13-cc1cc788',
    'foo:999/bar:v1.2.3-hotfix-immediate',
    'foo:999/bar:v1.2.3-immediate-hotfix',
    'foo:999/bar:v1.2.3-hotfix-hotfix',
    'foo:999/bar:v1.2.3-immediate-immediate',
  ];
  for (const tag of invalidTags) {
    t.false(isValid(tag), tag);
  }
});

test('isHotfix returns false on invalid versions', (t) => {
  const invalidTags = [
    'v0.0.0',
    'v1.2.3-canary',
    'v1.2.3-immediate',
    'v1.22.333',
    'G-0-H',
    'C-0-N',
    '0.0.0',
    '0.0.0+hotfix',
    '0.0.0-hot',
    'v0.0.0 foo',
    'foo v0.0.0',
    'v0.0',
    'v0.0.',
    'v0.0.0 -hotfix',
    'v0.0.0--hotfix',
    'v0.0.0-hotfi x',
    'v01.22.333',
    'v0.0.0+ferrary',
    'v0.0.0-ferrary+slow',
    'v1.3.13-cc1cc788',
  ];
  for (const tag of invalidTags) {
    t.false(isHotfix(tag), tag);
  }
});

test('isImmediate returns false on invalid versions', (t) => {
  const invalidTags = [
    'v0.0.0',
    'v1.2.3-canary',
    'v1.2.3-hotfix',
    'v1.22.333',
    'G-0-H',
    'C-0-N',
    '0.0.0',
    '0.0.0+immediate',
    '0.0.0-imm',
    'v0.0.0 foo',
    'foo v0.0.0',
    'v0.0',
    'v0.0.',
    'v0.0.0 -immediate',
    'v0.0.0--immediate',
    'v0.0.0-immediat e',
    'v01.22.333',
    'v0.0.0+ferrary',
    'v0.0.0-ferrary+slow',
    'v1.3.13-cc1cc788',
  ];
  for (const tag of invalidTags) {
    t.false(isImmediate(tag), tag);
  }
});

test('compare sorts the latest version at the smallest index', (t) => {
  const validTags = [
    'a:v1.1.4-canary',
    'myhub.com/myorg/node:v1.0.6-canary-hotfix',
    'a:v0.0.8',
    'a:v0.0.11',
    'myhub.com/myorg/node:v0.0.1-hotfix',
    'a:v0.0.0',
    'a:v0.2.5',
    'a:v0.2.3-immediate',
    'a:v1.0.0',
    'myhub.com/myorg/node:v1.1.3',
    'a:v0.20.0-hotfix',
    'a:v0.2.0-canary',
    'a:v1.11.0',
    'a:v1.1.0',
  ];
  const sorted = validTags.sort(compare);
  t.deepEqual(sorted, [
    'a:v0.0.0',
    'myhub.com/myorg/node:v0.0.1-hotfix',
    'a:v0.0.8',
    'a:v0.0.11',
    'a:v0.2.0-canary',
    'a:v0.2.3-immediate',
    'a:v0.2.5',
    'a:v0.20.0-hotfix',
    'a:v1.0.0',
    'myhub.com/myorg/node:v1.0.6-canary-hotfix',
    'a:v1.1.0',
    'myhub.com/myorg/node:v1.1.3',
    'a:v1.1.4-canary',
    'a:v1.11.0',
  ]);
});
test('regression sort', (t) => {
  const validTags = ['a:myhub.com/myorg/node:v1.3.11', 'a:v1.3.9', 'a:v1.3.13'];
  const sorted = validTags.sort(compare);
  t.deepEqual(sorted, ['a:v1.3.9', 'a:myhub.com/myorg/node:v1.3.11', 'a:v1.3.13']);
});

test('can parse image name from the tag', (t) => {
  const validTags = [
    'a:v1.1.4-canary',
    'myhub.com:23433/myorg/node:v1.0.6-canary-hotfix',
    'myhub.com/myorg/node:v1.0.6-canary-hotfix',
    'b:v0.0.8',
    'myhub.com/myorg/node:v0.0.11',
    'myhub.com/myorg/node:v0.0.1-hotfix',
    'foo:bar:c:v0.0.0',
    '::d:v0.2.5',
    'e:v0.2.3-immediate',
    'f:v1.0.0',
  ];

  const breakDown = [
    { Image: 'a', Tag: 'v1.1.4-canary' },
    { Image: 'myhub.com:23433/myorg/node', Tag: 'v1.0.6-canary-hotfix' },
    { Image: 'myhub.com/myorg/node', Tag: 'v1.0.6-canary-hotfix' },
    { Image: 'b', Tag: 'v0.0.8' },
    { Image: 'myhub.com/myorg/node', Tag: 'v0.0.11' },
    { Image: 'myhub.com/myorg/node', Tag: 'v0.0.1-hotfix' },
    { Image: 'foo:bar:c', Tag: 'v0.0.0' },
    { Image: '::d', Tag: 'v0.2.5' },
    { Image: 'e', Tag: 'v0.2.3-immediate' },
    { Image: 'f', Tag: 'v1.0.0' },
  ];

  for (let i = 0; i < validTags.length; i++) {
    t.deepEqual(parseImageTag(validTags[i]), breakDown[i]);
  }
});

test('returns undefined if image name missing or malformed tag', (t) => {
  const invalidNamesWithTags = [
    'G-0-H',
    'C-0-N',
    '0.0.0',
    'v0.0.0 foo',
    'foo v0.0.0',
    'v0.0',
    'v0.0.',
    'v0.0.0 -canary',
    'v0.0.0-canar y',
    'v01.22.333',
    'v0.0.0-ferrary',
    'v0.0.0-ferrary+slow',
    'v1.3.13-cc1cc788',
    'v1.2.3-hotfix-immediate',
    'v1.2.3-immediate-hotfix',
    'v1.2.3-hotfix-hotfix',
    'v1.2.3-immediate-immediate',
    ':G-0-H',
    ':C-0-N',
    ':0.0.0',
    ':v0.0.0 foo',
    ':foo v0.0.0',
    ':v0.0',
    ':v0.0.',
    ':v0.0.0 -canary',
    ':v0.0.0-canar y',
    ':v01.22.333',
    ':v0.0.0-ferrary',
    ':v0.0.0-ferrary+slow',
    ':v1.3.13-cc1cc788',
    ':v1.2.3-hotfix-immediate',
    ':v1.2.3-immediate-hotfix',
    ':v1.2.3-hotfix-hotfix',
    ':v1.2.3-immediate-immediate',
    'v1.1.4-canary',
    'v1.0.6-canary-hotfix',
    'v0.0.8',
    'v0.0.11',
    'v0.0.1-hotfix',
    'v0.0.0',
    'v0.2.5',
    'v0.2.3-immediate',
    'v1.0.0',
    'v1.1.3',
    'v0.20.0-hotfix',
    'v0.2.0-canary',
    'v1.11.0',
    'v1.1.0',
    ':v1.1.4-canary',
    ':v1.0.6-canary-hotfix',
    ':v0.0.8',
    ':v0.0.11',
    ':v0.0.1-hotfix',
    ':v0.0.0',
    ':v0.2.5',
    ':v0.2.3-immediate',
    ':v1.0.0',
    ':v1.1.3',
    ':v0.20.0-hotfix',
    ':v0.2.0-canary',
    ':v1.11.0',
    ':v1.1.0',
    'av1.1.4-canary',
    'sv1.0.6-canary-hotfix',
    'dv0.0.8',
    'fv0.0.11',
    'gv0.0.1-hotfix',
    'hv0.0.0',
    'jv0.2.5',
    'kv0.2.3-immediate',
    'zv1.0.0',
    'xv1.1.3',
    'foo:G-0-H',
    'foo::C-0-N',
    'foo::0.0.0',
    'foo::v0.0.0 foo',
    'foo::foo v0.0.0',
    'foo::v0.0',
    'foo::v0.0.',
    'foo::v0.0.0 -canary',
    'foo::v0.0.0-canar y',
    'foo::v01.22.333',
    'foo::v0.0.0-ferrary',
    'foo::v0.0.0-ferrary+slow',
    'foo::v1.3.13-cc1cc788',
    'foo::v1.2.3-hotfix-immediate',
    'foo::v1.2.3-immediate-hotfix',
    'foo::v1.2.3-hotfix-hotfix',
    'foo::v1.2.3-immediate-immediate',
  ];

  for (let i = 0; i < invalidNamesWithTags.length; i++) {
    t.deepEqual(parseImageTag(invalidNamesWithTags[i]), undefined);
  }
});
