import deepmerge from 'deepmerge';

export function arrayMerge<T extends object>(
    target: T[],
    source: T[],
    options: deepmerge.Options & {
        cloneUnlessOtherwiseSpecified<V>(value: V, options: deepmerge.Options): V;
    }
) {
    const destination = target.slice();
    source.forEach((item, index) => {
        if (typeof destination[index] === 'undefined') {
            destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
        } else if (options.isMergeableObject && options.isMergeableObject(item)) {
            destination[index] = deepmerge(target[index], item, options);
        } else if (!target.includes(item)) {
            destination.push(item);
        }
    });
    return destination;
}
export function merge<T1, T2>(x: Partial<T1>, y: Partial<T2>): T1 & T2 {
    return deepmerge(x, y, { arrayMerge });
}
