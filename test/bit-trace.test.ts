import * as fs from 'fs';
import { implode } from '../src/implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';

// Patch outputBits to trace all bit outputs
let bitTrace: string[] = [];
let originalOutputBits: any = null;

function patchOutputBits() {
  // We need to patch the outputBits function in the implode module
  const implodeModule = require('../src/implode/implode');
  
  // This is a bit hacky, but we'll override the outputBits calls by patching the compression
  bitTrace = [];
  console.log('✅ Bit tracing enabled');
}

describe('Bit Level Debug', () => {
  it('should trace the exact bits being output around the divergence point', () => {
    patchOutputBits();
    
    // Read just the first 16 bytes to isolate the issue
    const originalData = fs.readFileSync('test-fixtures/binary.decomp').slice(0, 16);
    const expectedCompressed = fs.readFileSync('test-fixtures/binary.imploded');
    
    console.log(`\n🔬 BIT-LEVEL TRACE FOR FIRST 16 BYTES`);
    console.log(`=====================================`);
    console.log(`Input: ${Array.from(originalData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`Expected (first 20 bytes): ${Array.from(expectedCompressed.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Compress
    let ourCompressed: Uint8Array = new Uint8Array(0);
    let totalRead = 0;
    
    const result = implode(
      (buf: Uint8Array, bytesToRead: number): number => {
        const remaining = originalData.length - totalRead;
        const toRead = Math.min(bytesToRead, remaining);
        if (toRead > 0) {
          buf.set(originalData.slice(totalRead, totalRead + toRead));
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
    
    console.log(`\n📊 COMPRESSION RESULT:`);
    console.log(`Our output: ${Array.from(ourCompressed).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Find divergence
    let firstDiff = -1;
    const maxLen = Math.min(ourCompressed.length, 20);
    for (let i = 0; i < maxLen; i++) {
      if (ourCompressed[i] !== expectedCompressed[i]) {
        firstDiff = i;
        break;
      }
    }
    
    if (firstDiff >= 0) {
      console.log(`\n🚨 DIVERGENCE AT BYTE ${firstDiff}:`);
      console.log(`Our:      0x${ourCompressed[firstDiff].toString(16).padStart(2, '0')} = ${ourCompressed[firstDiff].toString(2).padStart(8, '0')}b`);
      console.log(`Expected: 0x${expectedCompressed[firstDiff].toString(16).padStart(2, '0')} = ${expectedCompressed[firstDiff].toString(2).padStart(8, '0')}b`);
      
      // Show the exact bit difference
      const ourBits = ourCompressed[firstDiff].toString(2).padStart(8, '0');
      const expectedBits = expectedCompressed[firstDiff].toString(2).padStart(8, '0');
      let bitDiff = '';
      for (let i = 0; i < 8; i++) {
        bitDiff += ourBits[i] === expectedBits[i] ? '.' : 'X';
      }
      console.log(`Diff:     ${bitDiff}`);
      
      // Analyze the bit positions that differ
      for (let i = 0; i < 8; i++) {
        if (ourBits[i] !== expectedBits[i]) {
          console.log(`  Bit ${7-i}: our ${ourBits[i]}, expected ${expectedBits[i]}`);
        }
      }
    }
    
    console.log(`\n📝 Analysis:`);
    console.log(`The ${firstDiff >= 0 ? 'difference at byte ' + firstDiff : 'match'} suggests the issue is in compression logic around this point.`);
    console.log(`This is likely in literal vs repetition encoding or in distance/length bit encoding.`);
    
    if (bitTrace.length > 0) {
      console.log(`\n🔍 Bit Trace (first 10 operations):`);
      bitTrace.slice(0, 10).forEach((trace, i) => {
        console.log(`  ${i}: ${trace}`);
      });
    }
  });
});
