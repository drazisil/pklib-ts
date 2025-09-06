import { explode } from '../explode/explode';
import fs from 'fs';
import path from 'path';

describe('First Operations Debug', () => {
  it('should debug the very first operations in detail', () => {
    // Read a simple test file
    const testFile = path.join(__dirname, '../../../pklib/tests/testDataset/implode-decoder/small.imploded');
    const compressedData = fs.readFileSync(testFile);
    
    console.log(`File: ${compressedData.length} bytes`);
    console.log(`First 16 bytes: ${Array.from(compressedData.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Parse header manually
    const compressionType = compressedData[0]; // 0x00 (CMP_BINARY)
    const dictSizeBits = compressedData[1];     // 0x04 (1024 bytes)
    const initialBitBuffer = compressedData[2]; // 0x86
    const firstDataByte = compressedData[3];    // 0xbc
    
    console.log(`Header: type=${compressionType}, dictBits=${dictSizeBits}`);
    console.log(`Initial bit buffer: 0x${initialBitBuffer.toString(16)} (${initialBitBuffer.toString(2).padStart(8, '0')})`);
    console.log(`First data byte: 0x${firstDataByte.toString(16)} (${firstDataByte.toString(2).padStart(8, '0')})`);
    
    // According to the working JS implementation:
    // - bitBuffer starts as 0x86
    // - extraBits starts as 0
    // - first readBits call should check bitBuffer & 1 = 0x86 & 1 = 0 (even)
    console.log(`First bit (bitBuffer & 1): ${initialBitBuffer & 1} (${initialBitBuffer & 1 ? 'repeated literal' : 'single literal'})`);
    
    // Since bit is 0, it should go to single literal (binary mode)
    // This should call wasteBits(1) to consume that first bit
    // With extraBits=0, this should load the first data byte (0xbc) into the buffer
    
    // After loading 0xbc and consuming 1 bit:
    // bitBuffer |= (0xbc << (8 + 0)) = bitBuffer |= (0xbc << 8) = 0x86 | 0xbc00 = 0xbc86
    // bitBuffer >>= 1 = 0xbc86 >> 1 = 0x5e43
    // extraBits += 8 - 1 = 7
    
    const expectedAfterFirst = ((initialBitBuffer | (firstDataByte << 8)) >>> 1);
    console.log(`Expected after first bit consumption: 0x${expectedAfterFirst.toString(16)}`);
    
    // For binary mode single literal, it should then call wasteBits(8)
    // With extraBits=7, this needs 1 more bit, so loads next byte
    
    const secondDataByte = compressedData[4]; // 0x61
    console.log(`Second data byte: 0x${secondDataByte.toString(16)}`);
    
    // Try decompression with the real function and see what happens
    let readPosition = 0;
    const readFunc = (buf: Uint8Array, maxBytes: number) => {
      const availableBytes = Math.min(maxBytes, compressedData.length - readPosition);
      buf.set(compressedData.subarray(readPosition, readPosition + availableBytes));
      readPosition += availableBytes;
      return availableBytes;
    };
    
    let decompressedBytes: number[] = [];
    const writeFunc = (data: Uint8Array, bytesWritten: number) => {
      for (let i = 0; i < bytesWritten; i++) {
        decompressedBytes.push(data[i]);
      }
    };
    
    const result = explode(readFunc, writeFunc);
    
    console.log(`Result: success=${result.success}, errorCode=${result.errorCode}`);
    if (decompressedBytes.length > 0) {
      console.log(`First few decompressed bytes: ${decompressedBytes.slice(0, 10).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      const text = String.fromCharCode(...decompressedBytes.slice(0, 50));
      console.log(`As text: "${text}"`);
    }
  });
});
