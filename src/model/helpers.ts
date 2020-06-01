interface RefTimed {
    RefTime: number;
}

// assumes events start from RefTime and end when a new event comes
export function findAllEventsCoveringRange(collection: RefTimed[], fromTime: number, toTime: number): unknown[] {
    // working over a reversed version of res since array.push is much more efficient than array.unshift
    const resReversed: RefTimed[] = [];
    for (let i = collection.length - 1; i >= 0; i--) {
        const item = collection[i];
        if (item.RefTime > toTime) continue;
        if (item.RefTime < fromTime) {
            if (resReversed.length == 0 || resReversed[resReversed.length - 1].RefTime != fromTime)
                resReversed.push(item);
            return resReversed.reverse();
        }
        resReversed.push(item);
    }
    return resReversed.reverse();
}
