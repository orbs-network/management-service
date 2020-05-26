/**
 * approximation of block time
 * low O(n) memory and I/O
 */
export class BlocksTimeModel {
    private exactBlocksTime = new Map<number, number>();

    constructor(private requestBlockTime: (blockNumber: number) => Promise<number | null>) {}

    /**
     * get the exact time of a block from ethereum
     */
    async getExactBlockTime(blockNumber: number): Promise<number | null> {
        const fromCache = this.exactBlocksTime.get(blockNumber);
        if (typeof fromCache === 'number') {
            return fromCache;
        }
        const result = await this.requestBlockTime(blockNumber);
        if (result == null) {
            return null;
        } else {
            this.exactBlocksTime.set(blockNumber, result);
            return result;
        }
    }
}
