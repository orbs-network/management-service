/**
 * create an array of numbers, from 0 to range
 */
export function range(length: number) {
    return [...Array(length).keys()];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorString(e: any) {
    return (e && e.stack) || '' + e;
}
