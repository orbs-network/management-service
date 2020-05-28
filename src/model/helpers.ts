interface RefTimed {
    RefTime: number;
}

export function findAllEventsInRange(collection: RefTimed[], fromTime: number, toTime: number): RefTimed[] {
    const res: RefTimed[] = [];
    for (let i = collection.length - 1; i >= 0; i--) {
        const item = collection[i];
        if (item.RefTime > toTime) continue;
        res.unshift(item);
        if (item.RefTime < fromTime) break;
    }
    return res;
}
