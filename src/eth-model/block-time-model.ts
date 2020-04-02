/**
 * approximation of block time
 * low O(n) memory and I/O
 */
export class BlocksTimeModel {
    private exactBlocksTime = new Map<number, number>();

    constructor(
        private requestBlockTime: (blockNumber: number) => Promise<number | null>,
        private sampleSpan: number
    ) {}

    /**
     * get the exact time of a block from ethereum
     */
    async getExactBlockTime(blockNumber: number): Promise<number | null> {
        const fromCache = this.exactBlocksTime.get(blockNumber);
        if (typeof fromCache === 'number') {
            return fromCache;
        }
        const result = await this.requestBlockTime(blockNumber);
        if (result) {
            this.exactBlocksTime.set(blockNumber, result);
        }
        return result;
    }

    async getApproximateBlockTime(blockNumber: number): Promise<number> {
        const firstBlockNumber = blockNumber - (blockNumber % this.sampleSpan);
        const firstBlockTime = await this.getExactBlockTime(firstBlockNumber);
        if (firstBlockTime == null) {
            throw new Error(`got null reading block ${firstBlockNumber}`);
        }
        if (firstBlockNumber === blockNumber) {
            return firstBlockTime;
        }
        // todo don't pass max block
        const lastBlockNumber = this.sampleSpan + firstBlockNumber;
        const lastBlockTime = await this.getExactBlockTime(lastBlockNumber);
        if (lastBlockTime == null) {
            // poll block time directly
            const result = await this.getExactBlockTime(blockNumber);
            if (result == null) {
                throw new Error(`got null reading block ${blockNumber}`);
            }
            return result;
        }
        const timePerBlock = (lastBlockTime - firstBlockTime) / this.sampleSpan;
        return firstBlockTime + (blockNumber - firstBlockNumber) * timePerBlock;
    }
}
