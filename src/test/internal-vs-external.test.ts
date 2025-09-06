/**
 * Simple test to directly compare internal vs external data handling
 */

import * as fs from 'fs';
import * as path from 'path';
import { implode } from '../implode/implode';
import { explodePKLib } from '../explode/explode';
import { getImplodeSizeConstants } from '../implode/implode';
import { getExplodeSizeConstants } from '../explode/explode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';

describe('Internal vs External Data Comparison', () => {
  function createStreamFunctions(inputData: Uint8Array) {
    let inputPos = 0;
    const outputChunks: Uint8Array[] = [];

    const readFunc = (buffer: Uint8Array, size: number): number => {
      const remainingBytes = inputData.length - inputPos;
      const bytesToRead = Math.min(size, remainingBytes);
      
      if (bytesToRead > 0) {
        buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
        inputPos += bytesToRead;
      }
      
      return bytesToRead;
    };

    const writeFunc = (buffer: Uint8Array, size: number): number => {
      outputChunks.push(buffer.slice(0, size));
      return size;
    };

    const getOutput = (): Uint8Array => {
      const totalSize = outputChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of outputChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    };

    const reset = () => {
      inputPos = 0;
      outputChunks.length = 0;
    };

    return { readFunc, writeFunc, getOutput, reset };
  }

  it('should create data that can be decompressed', () => {
    // Create test data
    const testText = "Collaboratively administrate empowered markets via plug-and-play networks.";
    const originalData = new Uint8Array(testText.split('').map(c => c.charCodeAt(0)));
    
    console.log(`Creating test data: "${testText}"`);
    console.log(`Original size: ${originalData.length} bytes`);
    
    // Compress it
    const compressStreams = createStreamFunctions(originalData);
    const compressResult = implode(
      compressStreams.readFunc,
      compressStreams.writeFunc,
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1 // 1024 bytes, dict bits = 4
    );
    
    expect(compressResult.success).toBe(true);
    const compressedData = compressStreams.getOutput();
    
    console.log(`Compressed to ${compressedData.length} bytes`);
    console.log(`Header: ${Array.from(compressedData.slice(0, 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
    
    // Now try to decompress it using the SAME approach as external files
    // This will tell us if the issue is in our compression or decompression
    
    // Parse header manually like external files
    const compressionType = compressedData[0];
    const dictSizeBits = compressedData[1];
    const initialBitBuffer = compressedData[2];
    
    console.log(`Manual header parse: type=${compressionType}, dictBits=${dictSizeBits}, initBits=0x${initialBitBuffer.toString(16)}`);
    
    // Create decompression that handles PKLib format correctly  
    const decompressStreams = createStreamFunctions(compressedData); // Include full data with header
    
    // We need a PKLib-compatible explode function
    // For now, let's try the manual approach that matches the C code
    let readPosition = 0;
    const pkLibReadFunc = (buffer: Uint8Array, size: number): number => {
      const bytesToRead = Math.min(size, compressedData.length - readPosition);
      if (bytesToRead <= 0) return 0;
      
      for (let i = 0; i < bytesToRead; i++) {
        buffer[i] = compressedData[readPosition + i];
      }
      readPosition += bytesToRead;
      return bytesToRead;
    };
    
    const outputData: number[] = [];
    const pkLibWriteFunc = (buffer: Uint8Array, size: number): number => {
      for (let i = 0; i < size; i++) {
        outputData.push(buffer[i]);
      }
      return size;
    };
    
    // Try to use a PKLib-compatible approach
    // First, manually extract header
    const pkLibCompressionType = compressedData[0];
    const pkLibDictSizeBits = compressedData[1]; 
    const pkLibInitialBitBuffer = compressedData[2];
    
    console.log(`PKLib manual: type=${pkLibCompressionType}, dictBits=${pkLibDictSizeBits}, initBits=0x${pkLibInitialBitBuffer.toString(16)}`);
    
    // Create read function for the entire buffer (header will be consumed by explodePKLib)
    readPosition = 0;
    const decompressResult = explodePKLib(
      pkLibReadFunc,
      pkLibWriteFunc
    );
    
    console.log(`Decompress result: success=${decompressResult.success}, error=${decompressResult.errorCode}`);
    
    if (decompressResult.success) {
      const decompressedData = new Uint8Array(outputData);
      console.log(`Decompressed to ${decompressedData.length} bytes`);
      
      const resultText = Array.from(decompressedData).map(b => String.fromCharCode(b)).join('');
      console.log(`Result text: "${resultText}"`);
      
      expect(decompressedData).toEqual(originalData);
      console.log('✅ Our own compression works with external-style decompression!');
    } else {
      console.log('❌ Even our own compression fails with external-style decompression');
      // This tells us the issue is in how we handle the header separation
    }
  });

  it('should examine the external file more closely', () => {
    const fixturesDir = path.join(__dirname, '../../test-fixtures');
    const compressedPath = path.join(fixturesDir, 'small.imploded');
    const expectedPath = path.join(fixturesDir, 'small.decomp');
    
    if (!fs.existsSync(compressedPath)) {
      console.log('External file not found, skipping');
      return;
    }
    
    const compressedData = new Uint8Array(fs.readFileSync(compressedPath));
    const expectedData = new Uint8Array(fs.readFileSync(expectedPath));
    
    const expectedText = Array.from(expectedData).map(b => String.fromCharCode(b)).join('');
    console.log(`External expected: "${expectedText.slice(0, 74)}"`);
    console.log(`External header: ${Array.from(compressedData.slice(0, 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
    
    // This will help us see the differences
  });
});
