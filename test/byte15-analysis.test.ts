import * as fs from 'fs';
import * as path from 'path';
import { implode } from '../src/implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';

describe('Byte 15 Bit Analysis', () => {
  test('Analyze the exact bit difference at byte 15', () => {
    const originalPath = path.join(__dirname, '../test-fixtures/binary.decomp');
    const expectedPath = path.join(__dirname, '../test-fixtures/binary.imploded');
    
    // Read original and expected
    const originalData = fs.readFileSync(originalPath);
    const expectedCompressed = fs.readFileSync(expectedPath);
    
    // Compress using our algorithm
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
      const available = Math.min(bytesToRead, originalData.length - readIndex);
      if (available <= 0) return 0;
      
      buffer.set(originalData.slice(readIndex, readIndex + available));
      readIndex += available;
      return available;
    };

    const compressResult = implode(
      compressReadBuf,
      compressWriteBuf,
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3
    );
    
    console.log('🔍 BYTE 15 BIT ANALYSIS');
    console.log('=======================');
    
    const expectedByte15 = expectedCompressed[15];
    const ourByte15 = compressedData[15];
    
    console.log(`Expected byte 15: 0x${expectedByte15.toString(16).padStart(2, '0')} = ${expectedByte15.toString(2).padStart(8, '0')}b`);
    console.log(`Our byte 15:     0x${ourByte15.toString(16).padStart(2, '0')} = ${ourByte15.toString(2).padStart(8, '0')}b`);
    console.log('');
    
    // Analyze bit by bit
    console.log('Bit-by-bit comparison (bit 7 = MSB, bit 0 = LSB):');
    for (let bit = 7; bit >= 0; bit--) {
      const expectedBit = (expectedByte15 >> bit) & 1;
      const ourBit = (ourByte15 >> bit) & 1;
      const match = expectedBit === ourBit ? '✅' : '❌';
      console.log(`  Bit ${bit}: Expected=${expectedBit}, Ours=${ourBit} ${match}`);
    }
    console.log('');
    
    // Check the specific difference
    const xorResult = expectedByte15 ^ ourByte15;
    console.log(`XOR result: 0x${xorResult.toString(16).padStart(2, '0')} = ${xorResult.toString(2).padStart(8, '0')}b`);
    console.log(`This means bit ${Math.log2(xorResult)} is different`);
    console.log('');
    
    // Analyze surrounding bytes for context
    console.log('🔍 SURROUNDING BYTES CONTEXT');
    console.log('============================');
    for (let i = 12; i <= 18 && i < Math.min(expectedCompressed.length, compressedData.length); i++) {
      const exp = expectedCompressed[i];
      const our = compressedData[i];
      const match = exp === our ? '✅' : '❌';
      const highlight = i === 15 ? ' <- TARGET' : '';
      console.log(`Byte ${i.toString().padStart(2)}: Expected=0x${exp.toString(16).padStart(2, '0')}, Ours=0x${our.toString(16).padStart(2, '0')} ${match}${highlight}`);
    }
    
    expect(compressResult.success).toBe(true);
  });
});
