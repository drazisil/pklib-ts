/**
 * SlidingWindow class for handling the dictionary/history buffer
 * Based on the sliding window implementation in pklib
 */

export class SlidingWindow {
  private buffer: Uint8Array;
  private position: number = 0;
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Uint8Array(size);
  }

  /**
   * Write a single byte to the sliding window
   */
  writeByte(byte: number): void {
    this.buffer[this.position] = byte;
    this.position = (this.position + 1) % this.size;
  }

  /**
   * Write multiple bytes to the sliding window
   */
  writeBytes(bytes: Uint8Array, offset: number = 0, length?: number): void {
    const len = length ?? bytes.length - offset;
    for (let i = 0; i < len; i++) {
      this.writeByte(bytes[offset + i]);
    }
  }

  /**
   * Get a byte at a specific offset from current position
   */
  getByte(offset: number): number {
    const pos = (this.position - offset - 1 + this.size) % this.size;
    return this.buffer[pos];
  }

  /**
   * Copy bytes from a previous position (for decompression)
   */
  copyBytes(distance: number, length: number, output: Uint8Array, outputOffset: number): number {
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
  getPosition(): number {
    return this.position;
  }

  /**
   * Get the underlying buffer (for direct access when needed)
   */
  getBuffer(): Uint8Array {
    return this.buffer;
  }

  /**
   * Reset the sliding window
   */
  reset(): void {
    this.position = 0;
    this.buffer.fill(0);
  }

  /**
   * Get size of the sliding window
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Set position (useful for initializing with existing data)
   */
  setPosition(pos: number): void {
    this.position = pos % this.size;
  }

  /**
   * Fill buffer with data (useful for initialization)
   */
  fillBuffer(data: Uint8Array, offset: number = 0): void {
    const copyLength = Math.min(data.length - offset, this.size);
    this.buffer.set(data.subarray(offset, offset + copyLength));
    this.position = copyLength % this.size;
  }
}
