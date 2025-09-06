/**
 * Detailed diagnostic for external test fixture compatibility
 */

import * as fs from 'fs';
import * as path from 'path';
import { explode } from '../explode/explode';
import { CMP_BINARY, CMP_ASCII, PklibErrorCode } from '../types';

describe('Detailed External Test Diagnostics', () => {
  it('should diagnose small.imploded in detail', () => {
    const fixturesDir = path.join(__dirname, '../../test-fixtures');
    const compressedPath = path.join(fixturesDir, 'small.imploded');
    const expectedPath = path.join(fixturesDir, 'small.decomp');
    
    // Read files
    const compressedData = new Uint8Array(fs.readFileSync(compressedPath));
    const expectedData = new Uint8Array(fs.readFileSync(expectedPath));
    
    console.log('=== FILE ANALYSIS ===');
    console.log(`Compressed file size: ${compressedData.length} bytes`);
    console.log(`Expected output size: ${expectedData.length} bytes`);
    
    // Analyze header
    console.log('\n=== HEADER ANALYSIS ===');
    const compressionType = compressedData[0];
    const dictSizeBits = compressedData[1];
    const initialBitBuffer = compressedData[2];
    
    console.log(`Byte 0 (compression type): ${compressionType} (${compressionType === 0 ? 'BINARY' : 'ASCII'})`);
    console.log(`Byte 1 (dict size bits): ${dictSizeBits}`);
    console.log(`Byte 2 (initial bit buffer): 0x${initialBitBuffer.toString(16).padStart(2, '0')}`);
    
    // Calculate dictionary size
    let dictionarySize: number;
    switch (dictSizeBits) {
      case 4: dictionarySize = 1024; break;
      case 5: dictionarySize = 2048; break;
      case 6: dictionarySize = 4096; break;
      default: throw new Error(`Invalid dict size bits: ${dictSizeBits}`);
    }
    console.log(`Calculated dictionary size: ${dictionarySize} bytes`);
    
    // Show first 32 bytes of compressed data
    console.log('\n=== COMPRESSED DATA PREVIEW ===');
    const preview = Array.from(compressedData.slice(0, Math.min(32, compressedData.length)))
      .map((b, i) => `${i.toString().padStart(2)}: 0x${b.toString(16).padStart(2, '0')}`)
      .join('\n');
    console.log(preview);
    
    // Show expected output preview
    console.log('\n=== EXPECTED OUTPUT PREVIEW ===');
    const expectedPreview = Array.from(expectedData.slice(0, Math.min(64, expectedData.length)))
      .map(b => String.fromCharCode(b))
      .join('');
    console.log(`Expected output (as text): "${expectedPreview}"`);
    
    // Test with different read strategies
    console.log('\n=== TESTING DIFFERENT READ STRATEGIES ===');
    
    // Strategy 1: Read everything except header
    let readPos = 3; // Skip header
    const outputData1: number[] = [];
    
    const readFunc1 = (buffer: Uint8Array, size: number): number => {
      const bytesToRead = Math.min(size, compressedData.length - readPos);
      if (bytesToRead <= 0) return 0;
      
      for (let i = 0; i < bytesToRead; i++) {
        buffer[i] = compressedData[readPos + i];
      }
      readPos += bytesToRead;
      return bytesToRead;
    };
    
    const writeFunc1 = (buffer: Uint8Array, size: number): number => {
      for (let i = 0; i < size; i++) {
        outputData1.push(buffer[i]);
      }
      return size;
    };
    
    console.log('\nStrategy 1: Skip 3-byte header');
    const result1 = explode(readFunc1, writeFunc1);
    console.log(`Result: success=${result1.success}, errorCode=${result1.errorCode}`);
    console.log(`Output data length: ${outputData1.length}`);
    if (result1.errorCode !== PklibErrorCode.CMP_NO_ERROR) {
      console.log(`Error: ${PklibErrorCode[result1.errorCode]}`);
    }
    
    // Strategy 2: Read from start (let explode handle header)
    readPos = 0;
    const outputData2: number[] = [];
    
    const readFunc2 = (buffer: Uint8Array, size: number): number => {
      const bytesToRead = Math.min(size, compressedData.length - readPos);
      if (bytesToRead <= 0) return 0;
      
      for (let i = 0; i < bytesToRead; i++) {
        buffer[i] = compressedData[readPos + i];
      }
      readPos += bytesToRead;
      return bytesToRead;
    };
    
    const writeFunc2 = (buffer: Uint8Array, size: number): number => {
      for (let i = 0; i < size; i++) {
        outputData2.push(buffer[i]);
      }
      return size;
    };
    
    console.log('\nStrategy 2: Include header in data stream');
    const result2 = explode(readFunc2, writeFunc2);
    console.log(`Result: success=${result2.success}, errorCode=${result2.errorCode}`);
    console.log(`Output data length: ${outputData2.length}`);
    if (result2.errorCode !== PklibErrorCode.CMP_NO_ERROR) {
      console.log(`Error: ${PklibErrorCode[result2.errorCode]}`);
    }
    
    // If we got any output, compare with expected
    if (outputData1.length > 0) {
      console.log('\n=== STRATEGY 1 OUTPUT ANALYSIS ===');
      const output1 = new Uint8Array(outputData1);
      console.log(`First 64 chars: "${Array.from(output1.slice(0, 64)).map(b => String.fromCharCode(b)).join('')}"`);
      if (output1.length === expectedData.length) {
        const matches = output1.every((val, i) => val === expectedData[i]);
        console.log(`Data matches expected: ${matches}`);
        if (!matches) {
          // Find first difference
          for (let i = 0; i < Math.min(output1.length, expectedData.length); i++) {
            if (output1[i] !== expectedData[i]) {
              console.log(`First difference at byte ${i}: got 0x${output1[i].toString(16)}, expected 0x${expectedData[i].toString(16)}`);
              break;
            }
          }
        }
      }
    }
    
    if (outputData2.length > 0) {
      console.log('\n=== STRATEGY 2 OUTPUT ANALYSIS ===');
      const output2 = new Uint8Array(outputData2);
      console.log(`First 64 chars: "${Array.from(output2.slice(0, 64)).map(b => String.fromCharCode(b)).join('')}"`);
      if (output2.length === expectedData.length) {
        const matches = output2.every((val, i) => val === expectedData[i]);
        console.log(`Data matches expected: ${matches}`);
      }
    }
    
    // This test is for diagnostics, so don't fail on assertion
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
  });
});
