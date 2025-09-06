import { explodePKLib } from '../explode/explode';
import fs from 'fs';
import path from 'path';

describe('Bit Stream Debug', () => {
  it('should debug the bit stream operations', () => {
    // Read the external test file
    const testFile = path.join(__dirname, '../../../pklib/tests/testDataset/implode-decoder/small.imploded');
    const compressedData = fs.readFileSync(testFile);
    
    console.log(`Compressed data length: ${compressedData.length}`);
    console.log(`First 10 bytes: ${Array.from(compressedData.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Parse header manually
    const compressionType = compressedData[0];
    const dictSizeBits = compressedData[1];
    const initialBitBuffer = compressedData[2];
    
    console.log(`Header: type=${compressionType}, dictBits=${dictSizeBits}, initBits=0x${initialBitBuffer.toString(16)}`);
    
    // Try decompression with detailed logging
    let readPosition = 0;
    const readFunc = (buf: Uint8Array, maxBytes: number) => {
      const availableBytes = Math.min(maxBytes, compressedData.length - readPosition);
      buf.set(compressedData.subarray(readPosition, readPosition + availableBytes));
      console.log(`Reading ${availableBytes} bytes from position ${readPosition}: ${Array.from(buf.slice(0, Math.min(availableBytes, 10))).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      readPosition += availableBytes;
      return availableBytes;
    };
    
    let decompressedData: Uint8Array[] = [];
    const writeFunc = (data: Uint8Array, bytesWritten: number) => {
      console.log(`Writing ${bytesWritten} bytes: ${Array.from(data.slice(0, Math.min(bytesWritten, 20))).map(b => String.fromCharCode(b)).join('')}`);
      decompressedData.push(data.slice(0, bytesWritten));
    };
    
    const result = explodePKLib(readFunc, writeFunc);
    
    console.log(`Result: success=${result.success}, errorCode=${result.errorCode}`);
    
    if (decompressedData.length > 0) {
      const combined = new Uint8Array(decompressedData.reduce((acc, arr) => acc + arr.length, 0));
      let offset = 0;
      for (const chunk of decompressedData) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const text = new TextDecoder().decode(combined);
      console.log(`Decompressed text: "${text}"`);
    }
  });
});
