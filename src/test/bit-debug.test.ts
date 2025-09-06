import { implode } from '../implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

// We'll temporarily modify the outputBits function to log all calls
let outputBitsCalls: Array<{nbits: number, bitBuff: number, byte: number}> = [];

describe('Bit-level Debugging', () => {
  it('should trace exact bit output calls', () => {
    // Use just the first few bytes to get precise tracing
    const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
    const originalData = fs.readFileSync(path.join(originalDir, 'binary.decomp'));
    const testData = originalData.slice(0, 16); // Extended to see more pattern
    const externalCompressed = fs.readFileSync(path.join(originalDir, 'binary.imploded'));
    
    console.log(`\n🔬 Tracing bit output for: ${Array.from(testData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`Expected result: ${Array.from(externalCompressed.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    outputBitsCalls = [];
    
    let compressedData: Uint8Array = new Uint8Array(0);
    const compressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(compressedData.length + chunk.length);
      newData.set(compressedData);
      newData.set(chunk, compressedData.length);
      compressedData = newData;
      console.log(`📤 WriteBuf: ${Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      return bytesToWrite;
    };

    let readIndex = 0;
    const compressReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, testData.length - readIndex);
      console.log(`📥 ReadBuf: requesting ${bytesToRead}, have ${available}, read so far ${readIndex}/${testData.length}`);
      if (available <= 0) return 0;
      
      buffer.set(testData.slice(readIndex, readIndex + available));
      readIndex += available;
      return available;
    };

    const result = implode(
      compressReadBuf,
      compressWriteBuf,
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3
    );

    console.log(`\n📦 Our result: ${Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`📋 Expected:   ${Array.from(externalCompressed.slice(0, compressedData.length)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Find the first difference
    for (let i = 0; i < compressedData.length; i++) {
      if (i >= externalCompressed.length || compressedData[i] !== externalCompressed[i]) {
        console.log(`\n❌ First difference at byte ${i}:`);
        console.log(`   Our: 0x${compressedData[i].toString(16).padStart(2, '0')} (${compressedData[i].toString(2).padStart(8, '0')})`);
        console.log(`   Ext: 0x${externalCompressed[i]?.toString(16).padStart(2, '0') || 'XX'} (${externalCompressed[i]?.toString(2).padStart(8, '0') || 'XXXXXXXX'})`);
        
        if (i >= 3) { // Skip header bytes
          console.log(`\n🔍 This suggests the issue might be in the compression logic around position ${i}`);
        }
        break;
      } else if (i < 10) {
        console.log(`✅ Byte ${i} matches: 0x${compressedData[i].toString(16).padStart(2, '0')}`);
      }
    }
    
    expect(result.success).toBe(true);
  });
});
