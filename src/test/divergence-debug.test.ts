import * as fs from 'fs';
import { implode } from '../implode/implode';
import { explodePKLib } from '../explode/explode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';

describe('First Divergence Debug', () => {
  it('should analyze the exact point where our compression diverges from PKLib', () => {
    // Read binary data
    const originalData = fs.readFileSync('test-fixtures/binary.decomp');
    const expectedCompressed = fs.readFileSync('test-fixtures/binary.imploded');
    
    console.log(`\n🔍 DEBUGGING FIRST DIVERGENCE POINT`);
    console.log(`================================`);
    
    // Take only first 32 bytes to minimize complexity
    const testData = originalData.slice(0, 32);
    console.log(`\n📊 Test data (32 bytes):`);
    console.log(`  Hex: ${Array.from(testData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`  ASCII: ${Array.from(testData).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('')}`);
    
    // Compress with our algorithm
    let ourCompressed: Uint8Array = new Uint8Array(0);
    let totalRead = 0;
    
    const result = implode(
      (buf: Uint8Array, bytesToRead: number): number => {
        const remaining = testData.length - totalRead;
        const toRead = Math.min(bytesToRead, remaining);
        if (toRead > 0) {
          buf.set(testData.slice(totalRead, totalRead + toRead));
          totalRead += toRead;
        }
        return toRead;
      },
      (buf: Uint8Array, size: number) => {
        const newCompressed = new Uint8Array(ourCompressed.length + size);
        newCompressed.set(ourCompressed);
        newCompressed.set(buf.slice(0, size), ourCompressed.length);
        ourCompressed = newCompressed;
      },
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3
    );
    
    console.log(`\n📦 OUR COMPRESSION:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Size: ${ourCompressed.length} bytes`);
    console.log(`  Hex: ${Array.from(ourCompressed).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Get PKLib compression of same data
    const expectedForSameLength = expectedCompressed.slice(0, Math.min(30, expectedCompressed.length));
    console.log(`\n📋 EXPECTED (PKLib, first ${expectedForSameLength.length} bytes):`);
    console.log(`  Hex: ${Array.from(expectedForSameLength).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Find exact divergence
    let firstDiff = -1;
    const maxLen = Math.min(ourCompressed.length, expectedForSameLength.length);
    for (let i = 0; i < maxLen; i++) {
      if (ourCompressed[i] !== expectedForSameLength[i]) {
        firstDiff = i;
        break;
      }
    }
    
    if (firstDiff >= 0) {
      console.log(`\n🚨 FIRST DIFFERENCE AT BYTE ${firstDiff}:`);
      console.log(`  Our:     0x${ourCompressed[firstDiff].toString(16).padStart(2, '0')} = ${ourCompressed[firstDiff].toString(2).padStart(8, '0')}b`);
      console.log(`  PKLib:   0x${expectedForSameLength[firstDiff].toString(16).padStart(2, '0')} = ${expectedForSameLength[firstDiff].toString(2).padStart(8, '0')}b`);
      
      // Show bit difference
      const ourBits = ourCompressed[firstDiff].toString(2).padStart(8, '0');
      const expectedBits = expectedForSameLength[firstDiff].toString(2).padStart(8, '0');
      let bitDiff = '';
      for (let i = 0; i < 8; i++) {
        bitDiff += ourBits[i] === expectedBits[i] ? '.' : 'X';
      }
      console.log(`  Diff:    ${bitDiff} (X = different bit)`);
      
      // Show context
      const start = Math.max(0, firstDiff - 3);
      const end = Math.min(maxLen, firstDiff + 4);
      console.log(`\n📍 CONTEXT (bytes ${start}-${end-1}):`);
      console.log(`  Our:   [${Array.from(ourCompressed.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);
      console.log(`  PKLib: [${Array.from(expectedForSameLength.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);
    } else if (ourCompressed.length === expectedForSameLength.length) {
      console.log(`\n✅ PERFECT MATCH for first ${maxLen} bytes!`);
    } else {
      console.log(`\n📏 SAME BYTES but different lengths: ${ourCompressed.length} vs ${expectedForSameLength.length}`);
    }
    
    // Test decompression of our output
    console.log(`\n🧪 TESTING OUR COMPRESSION DECOMPRESSION:`);
    
    let readPosition = 0;
    const readBuf = (buffer: Uint8Array, size: number): number => {
      const bytesToRead = Math.min(size, ourCompressed.length - readPosition);
      if (bytesToRead <= 0) return 0;
      
      for (let i = 0; i < bytesToRead; i++) {
        buffer[i] = ourCompressed[readPosition + i];
      }
      readPosition += bytesToRead;
      return bytesToRead;
    };

    const outputData: number[] = [];
    const writeBuf = (buffer: Uint8Array, size: number): number => {
      for (let i = 0; i < size; i++) {
        outputData.push(buffer[i]);
      }
      return size;
    };

    const decompressResult = explodePKLib(readBuf, writeBuf);
    if (decompressResult.success) {
      const decompressed = new Uint8Array(outputData);
      console.log(`  Decompressed: ${decompressed.length} bytes`);
      
      // Check accuracy
      let matches = 0;
      const checkLen = Math.min(testData.length, decompressed.length);
      for (let i = 0; i < checkLen; i++) {
        if (testData[i] === decompressed[i]) matches++;
      }
      const accuracy = (matches / testData.length * 100).toFixed(2);
      console.log(`  Accuracy: ${matches}/${testData.length} bytes (${accuracy}%)`);
      
      if (accuracy !== "100.00") {
        // Find first mismatch
        for (let i = 0; i < checkLen; i++) {
          if (testData[i] !== decompressed[i]) {
            console.log(`  First mismatch at byte ${i}: expected 0x${testData[i].toString(16).padStart(2, '0')}, got 0x${decompressed[i].toString(16).padStart(2, '0')}`);
            break;
          }
        }
      }
    } else {
      console.log(`  ❌ Decompression failed`);
    }
  });
});
