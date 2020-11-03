import test from 'ava';
import { isValid, compare, isMain, isCanary, isHotfix, isImmediate } from './versioning';

test('isValid returns true on valid versions', (t) => {
  const validTags = [
    'v0.0.0',
    'v1.22.333',
    'v0.0.0-canary',
    'v0.0.0-hotfix',
    'v1.22.333-hotfix',
    'v0.0.0-canary-hotfix',
    'v0.0.0-immediate',
    'v1.22.333-immediate',
    'v0.0.0-canary-immediate',
  ];
  for (const tag of validTags) {
    t.true(isValid(tag), tag);
  }
});

test('isMain returns true on valid versions', (t) => {
  const validTags = [
    'v0.0.0',
    'v1.22.333',
    'v0.0.0-hotfix',
    'v1.22.333-hotfix',
    'v0.0.0-immediate',
    'v1.22.333-immediate',
  ];
  for (const tag of validTags) {
    t.true(isMain(tag), tag);
  }
});

test('isCanary returns true on valid versions', (t) => {
  const validTags = ['v0.0.0-canary', 'v0.0.0-canary-hotfix', 'v0.0.0-canary-immediate'];
  for (const tag of validTags) {
    t.true(isCanary(tag), tag);
  }
});

test('isHotfix returns true on valid versions', (t) => {
  const validTags = ['v0.0.0-hotfix', 'v1.22.333-hotfix', 'v0.0.0-canary-hotfix'];
  for (const tag of validTags) {
    t.true(isHotfix(tag), tag);
  }
});

test('isImmediate returns true on valid versions', (t) => {
  const validTags = ['v0.0.0-immediate', 'v1.22.333-immediate', 'v0.0.0-canary-immediate'];
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
  ];
  for (const tag of invalidTags) {
    t.false(isValid(tag), tag);
  }
});

test('isMain returns false on invalid versions', (t) => {
  const invalidTags = [
    'v0.0.0-canary',
    'v0.0.0-canary-hotfix',
    'v0.0.0-canary-immediate',
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
  ];
  for (const tag of invalidTags) {
    t.false(isMain(tag), tag);
  }
});

test('isCanary returns false on invalid versions', (t) => {
  const invalidTags = [
    'v0.0.0',
    'v1.22.333',
    'v0.0.0-hotfix',
    'v1.22.333-hotfix',
    'v0.0.0-immediate',
    'v1.22.333-immediate',
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
  ];
  for (const tag of invalidTags) {
    t.false(isCanary(tag), tag);
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
    'v1.1.4-canary',
    'v1.0.6-canary-hotfix',
    'v0.0.8',
    'v0.0.11',
    'v0.0.1-hotfix',
    'v0.0.0',
    '',
    'v0.2.5',
    'v0.2.3-immediate',
    'v1.0.0',
    'v1.1.3',
    'v0.20.0-hotfix',
    '',
    'v0.2.0-canary',
    'v1.11.0',
    'v1.1.0',
  ];
  const sorted = validTags.sort(compare);
  t.deepEqual(sorted, [
    '',
    '',
    'v0.0.0',
    'v0.0.1-hotfix',
    'v0.0.8',
    'v0.0.11',
    'v0.2.0-canary',
    'v0.2.3-immediate',
    'v0.2.5',
    'v0.20.0-hotfix',
    'v1.0.0',
    'v1.0.6-canary-hotfix',
    'v1.1.0',
    'v1.1.3',
    'v1.1.4-canary',
    'v1.11.0',
  ]);
});
test('regression sort', (t) => {
  const validTags = ['v1.3.11', 'v1.3.9', 'v1.3.13'];
  const sorted = validTags.sort(compare);
  t.deepEqual(sorted, ['v1.3.9', 'v1.3.11', 'v1.3.13']);
});
