/**
 * BitStream class for handling bit-level I/O operations
 * Based on the bit manipulation in pklib
 */
export declare class BitStream {
    private buffer;
    private extraBits;
    private inputBuffer;
    private inputPos;
    private inputBytes;
    private readFunc;
    constructor(readFunc: (buffer: Uint8Array, size: number) => number, inputBufferSize?: number);
    /**
     * Initialize the bit buffer with an initial value (from PKLib header)
     * According to C code and working JS implementation: bit_buff = header[2], extra_bits = 0
     */
    initializeBitBuffer(initialValue: number): void;
    /**
     * Load more data from input stream if needed
     */
    private loadInput;
    /**
     * Waste (consume) specified number of bits from the buffer
     * Returns false if there are no more bits available
     */
    wasteBits(nBits: number): boolean;
    /**
     * Get specified number of bits from buffer without consuming them
     */
    peekBits(nBits: number): number;
    /**
     * Get the current bit buffer value
     */
    getBitBuffer(): number;
    /**
     * Get the number of extra bits available
     */
    getExtraBits(): number;
    /**
     * Check if current bit is set
     */
    isCurrentBitSet(): boolean;
    /**
     * Get bits as mask (useful for getting multiple bits at once)
     */
    getBitMask(nBits: number): number;
    /**
     * Reset the bit stream state
     */
    reset(): void;
}
//# sourceMappingURL=BitStream.d.ts.map