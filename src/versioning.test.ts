import test from 'ava';
import { isValid, compare } from './versioning';

test('isValid returns true on valid versions', (t) => {
    const validTags = [
        'G-0-H',
        'G-0-N',
        'C-0-H',
        'C-0-N',
        'G-101-N',
        'foo G-101-N',
        'G-101-N bar',
        'foo G-101-N bar',
        'foo C-100-N bar G-101-N ',
        'foo C-100-N bar G-101-Nbar ',
        'foo C-100-N bar G-101-n ',
    ];
    for (const tag of validTags) {
        t.true(isValid(tag), tag);
    }
});

test('isValid returns false on invalid versions', (t) => {
    const invalidTags = [
        '1',
        'G-101',
        '101-N',
        'G- 101-N',
        'G -101-N',
        'G-101 -N',
        'G-101- N',
        'aG-101-N',
        'G-101-Na',
        'fooG-101-Nbar',
    ];
    for (const tag of invalidTags) {
        t.false(isValid(tag), tag);
    }
});

test('copmpare sorts the latest version at the smallest index', (t) => {
    const validTags = ['', 'G-2-N', 'G-0-N', '', 'G-1-N', 'G-4-N', 'G-7-N', 'G-3-N', '', 'G-6-N', ''];
    const sorted = validTags.sort(compare);

    t.deepEqual(sorted, ['G-7-N', 'G-6-N', 'G-4-N', 'G-3-N', 'G-2-N', 'G-1-N', 'G-0-N', '', '', '', '']);
});
