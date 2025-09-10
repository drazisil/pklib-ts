/**
 * SlidingWindow class for handling the dictionary/history buffer
 * Based on the sliding window implementation in pklib
 */
export declare class SlidingWindow {
    private buffer;
    private position;
    private size;
    constructor(size: number);
    /**
     * Write a single byte to the sliding window
     */
    writeByte(byte: number): void;
    /**
     * Write multiple bytes to the sliding window
     */
    writeBytes(bytes: Uint8Array, offset?: number, length?: number): void;
    /**
     * Get a byte at a specific distance back from current position
     */
    getByte(distance: number): number;
    /**
     * Copy bytes from a previous position (for decompression)
     */
    copyBytes(distance: number, length: number, output: Uint8Array, outputOffset: number): number;
    /**
     * Get current position in the buffer
     */
    getPosition(): number;
    /**
     * Get the underlying buffer (for direct access when needed)
     */
    getBuffer(): Uint8Array;
    /**
     * Reset the sliding window
     */
    reset(): void;
    /**
     * Get size of the sliding window
     */
    getSize(): number;
    /**
     * Set position (useful for initializing with existing data)
     */
    setPosition(pos: number): void;
    /**
     * Fill buffer with data (useful for initialization)
     */
    fillBuffer(data: Uint8Array, offset?: number): void;
}
//# sourceMappingURL=SlidingWindow.d.ts.map