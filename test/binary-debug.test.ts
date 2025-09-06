import { implode } from '../src/implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';
import fs from 'fs';
import path from 'path';

describe('Binary Bit Pattern Debug', () => {
  it('should debug bit output pattern', () => {
    // Use just a tiny portion of the binary data to debug
    const originalDir = path.join(__dirname, '../test-fixtures');
    const originalData = fs.readFileSync(path.join(originalDir, 'binary.decomp'));
    const externalCompressed = fs.readFileSync(path.join(originalDir, 'binary.imploded'));
    
    // Only use first 32 bytes to debug
    const testData = originalData.slice(0, 32);
    
    console.log(`\n🔬 Debugging compression of first 32 bytes:`);
    console.log(`Test data (${testData.length} bytes):`, Array.from(testData).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
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

    console.log(`\n📦 Compression result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Compressed to ${compressedData.length} bytes`);
    
    if (result.success && compressedData.length > 0) {
      console.log(`\n📋 Our compressed bytes:`);
      const ourHex = Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(ourHex);
      
      console.log(`\n📋 External compressed bytes (first ${compressedData.length}):`);
      const extSlice = externalCompressed.slice(0, compressedData.length);
      const extHex = Array.from(extSlice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(extHex);
      
      console.log(`\n🔍 Byte-by-byte comparison:`);
      for (let i = 0; i < compressedData.length; i++) {
        const match = i < externalCompressed.length && compressedData[i] === externalCompressed[i];
        const status = match ? '✅' : '❌';
        console.log(`  Byte ${i}: our 0x${compressedData[i].toString(16).padStart(2, '0')} vs ext 0x${externalCompressed[i]?.toString(16).padStart(2, '0') || 'XX'} ${status}`);
        
        if (!match && i >= 3) {
          // Show bit pattern for non-header bytes that differ
          console.log(`    Binary: our ${compressedData[i].toString(2).padStart(8, '0')} vs ext ${externalCompressed[i]?.toString(2).padStart(8, '0') || 'XXXXXXXX'}`);
        }
      }
    }
  });
});
