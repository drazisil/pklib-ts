"use strict";
/**
 * BitStream class for handling bit-level I/O operations
 * Based on the bit manipulation in pklib
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitStream = void 0;
class BitStream {
    constructor(readFunc, inputBufferSize = 0x800) {
        this.buffer = 0;
        this.extraBits = 0;
        this.inputPos = 0;
        this.inputBytes = 0;
        this.readFunc = readFunc;
        this.inputBuffer = new Uint8Array(inputBufferSize);
    }
    /**
     * Initialize the bit buffer with an initial value (from PKLib header)
     * According to C code and working JS implementation: bit_buff = header[2], extra_bits = 0
     */
    initializeBitBuffer(initialValue) {
        this.buffer = initialValue;
        this.extraBits = 0; // Critical: set to 0, no valid bits initially
    }
    /**
     * Load more data from input stream if needed
     */
    loadInput() {
        if (this.inputPos >= this.inputBytes) {
            this.inputPos = 0;
            this.inputBytes = this.readFunc(this.inputBuffer, this.inputBuffer.length);
            if (this.inputBytes === 0) {
                return false; // No more data
            }
        }
        return true;
    }
    /**
     * Waste (consume) specified number of bits from the buffer
     * Returns false if there are no more bits available
     */
    wasteBits(nBits) {
        // If we have enough bits in the buffer
        if (nBits <= this.extraBits) {
            this.extraBits -= nBits;
            this.buffer >>>= nBits;
            return true;
        }
        // Need to load more data
        if (!this.loadInput()) {
            return false; // No more data available
        }
        // Place the new byte in the second byte of the bitBuffer (high bits)
        // This matches the working JavaScript implementation
        const newByte = this.inputBuffer[this.inputPos++];
        this.buffer |= (newByte << (8 + this.extraBits));
        // Remove the used bits
        this.buffer >>>= nBits;
        this.extraBits += 8 - nBits;
        return true;
    }
    /**
     * Get specified number of bits from buffer without consuming them
     */
    peekBits(nBits) {
        return this.buffer & ((1 << nBits) - 1);
    }
    /**
     * Get the current bit buffer value
     */
    getBitBuffer() {
        return this.buffer;
    }
    /**
     * Get the number of extra bits available
     */
    getExtraBits() {
        return this.extraBits;
    }
    /**
     * Check if current bit is set
     */
    isCurrentBitSet() {
        return (this.buffer & 1) !== 0;
    }
    /**
     * Get bits as mask (useful for getting multiple bits at once)
     */
    getBitMask(nBits) {
        return (1 << nBits) - 1;
    }
    /**
     * Reset the bit stream state
     */
    reset() {
        this.buffer = 0;
        this.extraBits = 0;
        this.inputPos = 0;
        this.inputBytes = 0;
    }
}
exports.BitStream = BitStream;
//# sourceMappingURL=BitStream.js.map