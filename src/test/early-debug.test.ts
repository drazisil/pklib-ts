import { explode } from '../explode/explode';
import fs from 'fs';
import path from 'path';

describe('Early Debug', () => {
  it('should debug the first decodeLit call', () => {
    // Use the small test file
    const testFile = path.join(__dirname, '../../../pklib/tests/testDataset/implode-decoder/small.imploded');
    const compressedData = fs.readFileSync(testFile);
    
    console.log(`File: ${compressedData.length} bytes`);
    console.log(`Header bytes: 0x${compressedData[0].toString(16)} 0x${compressedData[1].toString(16)} 0x${compressedData[2].toString(16)}`);
    console.log(`First few data bytes: ${Array.from(compressedData.slice(3, 8)).map(b => '0x' + b.toString(16)).join(' ')}`);
    
    // Manual calculation based on working JS implementation
    const initialBitBuffer = compressedData[2]; // 0x86
    const firstDataByte = compressedData[3]; // 0xbc
    
    console.log(`Initial bit buffer: 0x${initialBitBuffer.toString(16)} (${initialBitBuffer.toString(2).padStart(8, '0')})`);
    console.log(`First data byte: 0x${firstDataByte.toString(16)} (${firstDataByte.toString(2).padStart(8, '0')})`);
    
    // First bit check: initialBitBuffer & 1 = 0x86 & 1 = 0 (single literal)
    const firstBit = initialBitBuffer & 1;
    console.log(`First bit: ${firstBit} (${firstBit ? 'repeated literal' : 'single literal'})`);
    
    // For single literal in binary mode, it should:
    // 1. wasteBits(1) to consume the decision bit
    // 2. getBitBuffer() & 0xFF to get the literal byte
    // 3. wasteBits(8) to consume the literal byte
    
    // After wasteBits(1):
    // buffer |= (firstDataByte << (8 + 0)) = 0x86 | 0xbc00 = 0xbc86
    // buffer >>= 1 = 0xbc86 >> 1 = 0x5e43
    // extraBits += 8 - 1 = 7
    
    const expectedAfterFirst = ((initialBitBuffer | (firstDataByte << 8)) >>> 1);
    console.log(`Expected after wasteBits(1): buffer=0x${expectedAfterFirst.toString(16)}, extraBits=7`);
    
    // Then getBitBuffer() & 0xFF should return 0x43
    const expectedLiteral = expectedAfterFirst & 0xFF;
    console.log(`Expected literal byte: 0x${expectedLiteral.toString(16)} ('${String.fromCharCode(expectedLiteral)}')`);
    
    // Then wasteBits(8) should consume that literal
    
    // Try the actual decompression but capture every write
    let writeCount = 0;
    let readPosition = 0;
    const readFunc = (buf: Uint8Array, maxBytes: number) => {
      const availableBytes = Math.min(maxBytes, compressedData.length - readPosition);
      buf.set(compressedData.subarray(readPosition, readPosition + availableBytes));
      readPosition += availableBytes;
      return availableBytes;
    };
    
    const writeFunc = (data: Uint8Array, bytesWritten: number) => {
      writeCount++;
      console.log(`Write #${writeCount}: ${bytesWritten} bytes`);
      if (bytesWritten > 0) {
        console.log(`  Data: ${Array.from(data.slice(0, Math.min(bytesWritten, 10))).map(b => '0x' + b.toString(16) + '("' + String.fromCharCode(b) + '")').join(' ')}`);
      }
    };
    
    const result = explode(readFunc, writeFunc);
    
    console.log(`Result: success=${result.success}, errorCode=${result.errorCode}`);
    console.log(`Total writes: ${writeCount}`);
  });
});
