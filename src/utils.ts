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

export function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
    return Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject('Timed out in ' + ms + 'ms.'), ms)),
    ]);
}
export const utcDay = 24 * 60 * 60;

// use for historic data endpoint
// export function timeWindow(time: number, windowSize: number) {
//     return {
//         from: time - (time % windowSize),
//         to: time - (time % windowSize) + windowSize,
//     };
// }
