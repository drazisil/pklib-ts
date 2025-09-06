/**
 * Debug test to understand the external format issue
 */

import * as fs from 'fs';
import * as path from 'path';
import { explode } from '../src/explode/explode';
import { implode } from '../src/implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';

describe('Debug External Format', () => {
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

  it('should test our own compression/decompression cycle', () => {
    const testData = "Hello, World! This is a test string for compression.";
    const originalData = new Uint8Array(testData.split('').map(c => c.charCodeAt(0)));
    
    console.log(`Original data: ${testData}`);
    console.log(`Original size: ${originalData.length} bytes`);
    
    // Test compression
    const compressStreams = createStreamFunctions(originalData);
    const compressResult = implode(
      compressStreams.readFunc,
      compressStreams.writeFunc,
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1
    );
    
    expect(compressResult.success).toBe(true);
    const compressedData = compressStreams.getOutput();
    console.log(`Compressed size: ${compressedData.length} bytes`);
    
    // Show compressed data header
    const header = Array.from(compressedData.slice(0, 8))
      .map(b => `0x${b.toString(16).padStart(2, '0')}`)
      .join(' ');
    console.log(`Compressed header: ${header}`);
    
    // Test decompression
    const decompressStreams = createStreamFunctions(compressedData);
    const decompressResult = explode(
      decompressStreams.readFunc,
      decompressStreams.writeFunc
    );
    
    console.log(`Decompression result: success=${decompressResult.success}, error=${decompressResult.errorCode}`);
    
    expect(decompressResult.success).toBe(true);
    const decompressedData = decompressStreams.getOutput();
    
    console.log(`Decompressed size: ${decompressedData.length} bytes`);
    expect(decompressedData).toEqual(originalData);
  });

  it('should examine external file format', () => {
    const fixturesDir = path.join(__dirname, '../test-fixtures');
    const filePath = path.join(fixturesDir, 'small.imploded');
    
    if (!fs.existsSync(filePath)) {
      console.log('Test fixture not found, skipping');
      return;
    }
    
    const fileData = new Uint8Array(fs.readFileSync(filePath));
    console.log(`File size: ${fileData.length} bytes`);
    
    // Show first 16 bytes
    const preview = Array.from(fileData.slice(0, 16))
      .map(b => `0x${b.toString(16).padStart(2, '0')}`)
      .join(' ');
    console.log(`File header: ${preview}`);
    
    // Parse header
    console.log(`Compression type: ${fileData[0]} (${fileData[0] === 0 ? 'BINARY' : 'ASCII'})`);
    console.log(`Dictionary bits: ${fileData[1]}`);
    console.log(`Initial bit buffer: 0x${fileData[2].toString(16)}`);
  });
});
