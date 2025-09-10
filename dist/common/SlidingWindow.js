"use strict";
/**
 * SlidingWindow class for handling the dictionary/history buffer
 * Based on the sliding window implementation in pklib
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlidingWindow = void 0;
class SlidingWindow {
    constructor(size) {
        this.position = 0;
        this.size = size;
        this.buffer = new Uint8Array(size);
    }
    /**
     * Write a single byte to the sliding window
     */
    writeByte(byte) {
        this.buffer[this.position] = byte;
        this.position = (this.position + 1) % this.size;
    }
    /**
     * Write multiple bytes to the sliding window
     */
    writeBytes(bytes, offset = 0, length) {
        const len = length ?? bytes.length - offset;
        for (let i = 0; i < len; i++) {
            this.writeByte(bytes[offset + i]);
        }
    }
    /**
     * Get a byte at a specific distance back from current position
     */
    getByte(distance) {
        const pos = (this.position - distance + this.size) % this.size;
        return this.buffer[pos];
    }
    /**
     * Copy bytes from a previous position (for decompression)
     */
    copyBytes(distance, length, output, outputOffset) {
        let copied = 0;
        for (let i = 0; i < length && copied < output.length - outputOffset; i++) {
            const byte = this.getByte(distance + i);
            output[outputOffset + copied] = byte;
            this.writeByte(byte);
            copied++;
        }
        return copied;
    }
    /**
     * Get current position in the buffer
     */
    getPosition() {
        return this.position;
    }
    /**
     * Get the underlying buffer (for direct access when needed)
     */
    getBuffer() {
        return this.buffer;
    }
    /**
     * Reset the sliding window
     */
    reset() {
        this.position = 0;
        this.buffer.fill(0);
    }
    /**
     * Get size of the sliding window
     */
    getSize() {
        return this.size;
    }
    /**
     * Set position (useful for initializing with existing data)
     */
    setPosition(pos) {
        this.position = pos % this.size;
    }
    /**
     * Fill buffer with data (useful for initialization)
     */
    fillBuffer(data, offset = 0) {
        const copyLength = Math.min(data.length - offset, this.size);
        this.buffer.set(data.subarray(offset, offset + copyLength));
        this.position = copyLength % this.size;
    }
}
exports.SlidingWindow = SlidingWindow;
//# sourceMappingURL=SlidingWindow.js.map