import test from 'ava';
import { findAllEventsCoveringRange } from './helpers';

test('findAllEventsCoveringRange on empty array', (t) => {
    t.deepEqual(findAllEventsCoveringRange([], 0, 1000), []);
});

test('findAllEventsCoveringRange with all times different', (t) => {
    const allDifferent = [{ RefTime: 12 }, { RefTime: 17 }, { RefTime: 23 }, { RefTime: 29 }];

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 900, 1000), [{ RefTime: 29 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 0, 10), []);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 0, 1000), allDifferent);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 0, 20), [{ RefTime: 12 }, { RefTime: 17 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 0, 17), [{ RefTime: 12 }, { RefTime: 17 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 25, 1000), [{ RefTime: 23 }, { RefTime: 29 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 23, 1000), [{ RefTime: 23 }, { RefTime: 29 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 20, 25), [{ RefTime: 17 }, { RefTime: 23 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 17, 23), [{ RefTime: 17 }, { RefTime: 23 }]);

    t.deepEqual(findAllEventsCoveringRange(allDifferent, 19, 21), [{ RefTime: 17 }]);
});

test('findAllEventsCoveringRange with some times identical', (t) => {
    const someIdentical = [
        { RefTime: 12, Data: 'A' },
        { RefTime: 17, Data: 'B' },
        { RefTime: 17, Data: 'C' },
        { RefTime: 17, Data: 'D' },
        { RefTime: 23, Data: 'E' },
        { RefTime: 23, Data: 'F' },
        { RefTime: 23, Data: 'G' },
        { RefTime: 29, Data: 'H' },
    ];

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 0, 20), [
        { RefTime: 12, Data: 'A' },
        { RefTime: 17, Data: 'B' },
        { RefTime: 17, Data: 'C' },
        { RefTime: 17, Data: 'D' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 0, 17), [
        { RefTime: 12, Data: 'A' },
        { RefTime: 17, Data: 'B' },
        { RefTime: 17, Data: 'C' },
        { RefTime: 17, Data: 'D' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 25, 1000), [
        { RefTime: 23, Data: 'G' },
        { RefTime: 29, Data: 'H' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 23, 1000), [
        { RefTime: 23, Data: 'E' },
        { RefTime: 23, Data: 'F' },
        { RefTime: 23, Data: 'G' },
        { RefTime: 29, Data: 'H' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 20, 25), [
        { RefTime: 17, Data: 'D' },
        { RefTime: 23, Data: 'E' },
        { RefTime: 23, Data: 'F' },
        { RefTime: 23, Data: 'G' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 17, 23), [
        { RefTime: 17, Data: 'B' },
        { RefTime: 17, Data: 'C' },
        { RefTime: 17, Data: 'D' },
        { RefTime: 23, Data: 'E' },
        { RefTime: 23, Data: 'F' },
        { RefTime: 23, Data: 'G' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 23, 23), [
        { RefTime: 23, Data: 'E' },
        { RefTime: 23, Data: 'F' },
        { RefTime: 23, Data: 'G' },
    ]);

    t.deepEqual(findAllEventsCoveringRange(someIdentical, 19, 21), [{ RefTime: 17, Data: 'D' }]);
});
