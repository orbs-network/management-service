interface RefTimed {
    RefTime: number;
}

// assumes events start from RefTime and end when a new event comes
export function findAllEventsInRange(collection: RefTimed[], fromTime: number, toTime: number): unknown[] {
    const res: RefTimed[] = [];
    for (let i = collection.length - 1; i >= 0; i--) {
        const item = collection[i];
        if (item.RefTime > toTime) continue;
        if (item.RefTime < fromTime) {
            if (!res[0] || res[0].RefTime != fromTime) res.unshift(item);
            return res;
        }
        res.unshift(item);
    }
    return res;
}
