const REGULAR_EXPRESSION = /^.*\b(([GC])-(0|[1-9]\d*)-([NH]))\b.*$/m;

export function isValid(src: string): boolean {
    return REGULAR_EXPRESSION.test(src);
}

export function compare(a: string, b: string): number {
    const aResult = REGULAR_EXPRESSION.exec(a);
    if (!aResult) {
        return 1;
    }
    const bResult = REGULAR_EXPRESSION.exec(b);
    if (!bResult) {
        return -1;
    }
    return Number(bResult[3]) - Number(aResult[3]);
}
