import { implode } from '../src/implode/implode';
import { explode } from '../src/explode/explode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';
import fs from 'fs';
import path from 'path';

describe('Binary Fixture - Fixed Dictionary Size', () => {
  it('should work perfectly with DICT_SIZE3 (6 bits)', () => {
    // Use the original binary data
    const originalDir = path.join(__dirname, '../test-fixtures');
    const originalData = fs.readFileSync(path.join(originalDir, 'binary.decomp'));
    const externalCompressed = fs.readFileSync(path.join(originalDir, 'binary.imploded'));
    
    console.log(`\n🧪 Binary fixture test with correct dictionary size:`);
    console.log(`Original data: ${originalData.length} bytes`);
    console.log(`External compressed: ${externalCompressed.length} bytes`);
    
    // Test decompression first
    console.log(`\n📖 Testing decompression:`);
    let decompressedData: Uint8Array = new Uint8Array(0);
    const decompressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(decompressedData.length + chunk.length);
      newData.set(decompressedData);
      newData.set(chunk, decompressedData.length);
      decompressedData = newData;
      return bytesToWrite;
    };

    let readIndex = 0;
    const decompressReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, externalCompressed.length - readIndex);
      if (available <= 0) return 0;
      
      buffer.set(externalCompressed.slice(readIndex, readIndex + available));
      readIndex += available;
      return available;
    };

    const decompressResult = explode(decompressReadBuf, decompressWriteBuf);
    
    console.log(`Decompression result: ${decompressResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Decompressed ${decompressedData.length} bytes`);
    
    // Compare decompressed data
    const decompressMatches = originalData.length === decompressedData.length &&
      originalData.every((byte, index) => byte === decompressedData[index]);
    
    console.log(`Decompression match: ${decompressMatches ? '✅ PERFECT' : '❌ DIFFERS'}`);
    
    // Test compression with correct dictionary size
    console.log(`\n📦 Testing compression with DICT_SIZE3 (6 bits):`);
    let compressedData: Uint8Array = new Uint8Array(0);
    const compressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(compressedData.length + chunk.length);
      newData.set(compressedData);
      newData.set(chunk, compressedData.length);
      compressedData = newData;
      return bytesToWrite;
    };

    readIndex = 0;
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
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3  // Use 6 bits
    );

    console.log(`Compression result: ${compressResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Compressed to ${compressedData.length} bytes (external: ${externalCompressed.length})`);
    
    if (compressResult.success) {
      // Compare with external compressed data
      const sizesMatch = compressedData.length === externalCompressed.length;
      console.log(`Size match: ${sizesMatch ? '✅ PERFECT' : '❌ DIFFERS'}`);
      
      if (sizesMatch) {
        let matchingBytes = 0;
        let firstDiff = -1;
        
        for (let i = 0; i < compressedData.length; i++) {
          if (compressedData[i] === externalCompressed[i]) {
            matchingBytes++;
          } else if (firstDiff === -1) {
            firstDiff = i;
          }
        }
        
        const accuracy = (matchingBytes / compressedData.length * 100).toFixed(1);
        console.log(`Byte accuracy: ${matchingBytes}/${compressedData.length} (${accuracy}%)`);
        
        if (firstDiff !== -1) {
          console.log(`First difference at byte ${firstDiff}: our 0x${compressedData[firstDiff].toString(16)} vs external 0x${externalCompressed[firstDiff].toString(16)}`);
          
          // Show surrounding bytes
          const start = Math.max(0, firstDiff - 5);
          const end = Math.min(compressedData.length, firstDiff + 6);
          
          console.log(`Context around first diff:`);
          const ourBytes = Array.from(compressedData.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          const extBytes = Array.from(externalCompressed.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`  Our:      ${ourBytes}`);
          console.log(`  External: ${extBytes}`);
        }
        
        if (matchingBytes === compressedData.length) {
          console.log(`🎉 PERFECT ROUND-TRIP ACHIEVED!`);
        }
      }
    }
    
    expect(decompressResult.success).toBe(true);
    expect(decompressMatches).toBe(true);
    expect(compressResult.success).toBe(true);
  });
});
