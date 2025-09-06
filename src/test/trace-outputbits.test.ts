import { implode } from '../implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

// Monkey patch outputBits to add logging
let originalOutputBits: any;

describe('Trace OutputBits Calls', () => {
  beforeAll(() => {
    // We'll need to access the internal outputBits function
    console.log('Setting up outputBits tracing...');
  });

  it('should trace outputBits calls during compression', () => {
    // Use just first 16 bytes to limit the trace output
    const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
    const originalData = fs.readFileSync(path.join(originalDir, 'binary.decomp'));
    const testData = originalData.slice(0, 16);
    const externalCompressed = fs.readFileSync(path.join(originalDir, 'binary.imploded'));
    
    console.log(`\n🔬 Tracing compression of first 16 bytes:`);
    console.log(`Input: ${Array.from(testData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`Expected output: ${Array.from(externalCompressed.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    let compressedData: Uint8Array = new Uint8Array(0);
    const compressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(compressedData.length + chunk.length);
      newData.set(compressedData);
      newData.set(chunk, compressedData.length);
      compressedData = newData;
      return bytesToWrite;
    };

    let readIndex = 0;
    const compressReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, testData.length - readIndex);
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

    console.log(`\n📦 Our output: ${Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`📋 Expected:   ${Array.from(externalCompressed.slice(0, compressedData.length)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Find first difference
    for (let i = 0; i < compressedData.length; i++) {
      if (i >= externalCompressed.length || compressedData[i] !== externalCompressed[i]) {
        console.log(`\n❌ First difference at byte ${i}:`);
        console.log(`   Our: 0x${compressedData[i].toString(16)} (${compressedData[i].toString(2).padStart(8, '0')})`);
        console.log(`   Ext: 0x${externalCompressed[i]?.toString(16) || 'XX'} (${externalCompressed[i]?.toString(2).padStart(8, '0') || 'XXXXXXXX'})`);
        break;
      } else if (i < 8) {
        console.log(`✅ Byte ${i} matches: 0x${compressedData[i].toString(16)}`);
      }
    }
  });
});
