import { explodePKLib } from '../explode/explode';
import fs from 'fs';
import path from 'path';

describe('ASCII Debug Analysis', () => {
  test('should analyze ASCII decoding mismatch', () => {
    console.log('\n🔍 ASCII Decoding Analysis:');
    
    const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
    const compressedPath = path.join(originalDir, 'large.imploded.ascii');
    const expectedPath = path.join(originalDir, 'large.decomp');
    
    const compressedData = fs.readFileSync(compressedPath);
    const expectedData = fs.readFileSync(expectedPath);
    
    console.log(`Expected char at 690: ${expectedData[690]} ('${String.fromCharCode(expectedData[690])}')`);
    console.log(`Expected char at 1525: ${expectedData[1525]} ('${String.fromCharCode(expectedData[1525])}')`);
    
    // Set up decompression
    let dataIndex = 0;
    const readBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, compressedData.length - dataIndex);
      if (available <= 0) return 0;
      
      buffer.set(compressedData.slice(dataIndex, dataIndex + available));
      dataIndex += available;
      return available;
    };

    let decompressedData: Uint8Array = new Uint8Array(0);
    const writeBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(decompressedData.length + chunk.length);
      newData.set(decompressedData);
      newData.set(chunk, decompressedData.length);
      decompressedData = newData;
      return bytesToWrite;
    };

    // Decompress
    const result = explodePKLib(readBuf, writeBuf);
    
    console.log(`Got char at 690: ${decompressedData[690]} ('${String.fromCharCode(decompressedData[690])}')`);
    console.log(`Got char at 1525: ${decompressedData[1525]} ('${String.fromCharCode(decompressedData[1525])}')`);
    
    // Find all mismatches
    let mismatches: Array<{pos: number, expected: number, got: number}> = [];
    for (let i = 0; i < Math.min(expectedData.length, decompressedData.length); i++) {
      if (decompressedData[i] !== expectedData[i]) {
        mismatches.push({
          pos: i,
          expected: expectedData[i],
          got: decompressedData[i]
        });
      }
    }
    
    console.log(`\n📊 Found ${mismatches.length} mismatches:`);
    for (let i = 0; i < Math.min(10, mismatches.length); i++) {
      const m = mismatches[i];
      console.log(`  ${m.pos}: expected ${m.expected} ('${String.fromCharCode(m.expected)}') got ${m.got} ('${String.fromCharCode(m.got)}')`);
    }
    
    // Check if it's a pattern
    const expectedChars = new Set(mismatches.map(m => m.expected));
    const gotChars = new Set(mismatches.map(m => m.got));
    console.log(`\nExpected chars in mismatches: ${Array.from(expectedChars).sort().join(', ')}`);
    console.log(`Got chars in mismatches: ${Array.from(gotChars).sort().join(', ')}`);
    
    // Check if 106->124 is the only pattern
    const pattern106to124 = mismatches.filter(m => m.expected === 106 && m.got === 124);
    console.log(`\n106->124 pattern count: ${pattern106to124.length}/${mismatches.length}`);
    
    expect(result.success).toBe(true);
  });
});
