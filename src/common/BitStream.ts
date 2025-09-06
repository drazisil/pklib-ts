/**
 * BitStream class for handling bit-level I/O operations
 * Based on the bit manipulation in pklib
 */

export class BitStream {
  private buffer: number = 0;
  private extraBits: number = 0;
  private inputBuffer: Uint8Array;
  private inputPos: number = 0;
  private inputBytes: number = 0;
  private readFunc: (buffer: Uint8Array, size: number) => number;

  constructor(readFunc: (buffer: Uint8Array, size: number) => number, inputBufferSize: number = 0x800) {
    this.readFunc = readFunc;
    this.inputBuffer = new Uint8Array(inputBufferSize);
  }

  /**
   * Initialize the bit buffer with an initial value (from PKLib header)
   * According to C code and working JS implementation: bit_buff = header[2], extra_bits = 0
   */
  initializeBitBuffer(initialValue: number): void {
    this.buffer = initialValue;
    this.extraBits = 0; // Critical: set to 0, no valid bits initially
  }

  /**
   * Load more data from input stream if needed
   */
  private loadInput(): boolean {
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
  wasteBits(nBits: number): boolean {
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
  peekBits(nBits: number): number {
    return this.buffer & ((1 << nBits) - 1);
  }

  /**
   * Get the current bit buffer value
   */
  getBitBuffer(): number {
    return this.buffer;
  }

  /**
   * Get the number of extra bits available
   */
  getExtraBits(): number {
    return this.extraBits;
  }

  /**
   * Check if current bit is set
   */
  isCurrentBitSet(): boolean {
    return (this.buffer & 1) !== 0;
  }

  /**
   * Get bits as mask (useful for getting multiple bits at once)
   */
  getBitMask(nBits: number): number {
    return (1 << nBits) - 1;
  }

  /**
   * Reset the bit stream state
   */
  reset(): void {
    this.buffer = 0;
    this.extraBits = 0;
    this.inputPos = 0;
    this.inputBytes = 0;
  }
}
