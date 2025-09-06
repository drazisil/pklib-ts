import { implode } from '../src/implode/implode';
import { explode } from '../src/explode/explode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';

describe('Literals Only Test', () => {
  it('should work with literals only (no repetitions)', () => {
    // Test data with no repetitions
    const testData = new Uint8Array([0x56, 0x45, 0x52, 0x20, 0x01, 0x02, 0x03, 0x04]);
    
    console.log(`\n🔍 Testing literals-only compression:`);
    console.log(`Input: ${Array.from(testData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Step 1: Compress
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

    const compressResult = implode(
      compressReadBuf,
      compressWriteBuf,
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3
    );

    console.log(`📦 Compression: ${compressResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Compressed: ${Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Step 2: Decompress
    let decompressedData: Uint8Array = new Uint8Array(0);
    const decompressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(decompressedData.length + chunk.length);
      newData.set(decompressedData);
      newData.set(chunk, decompressedData.length);
      decompressedData = newData;
      return bytesToWrite;
    };

    readIndex = 0;
    const decompressReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, compressedData.length - readIndex);
      if (available <= 0) return 0;
      
      buffer.set(compressedData.slice(readIndex, readIndex + available));
      readIndex += available;
      return available;
    };

    const decompressResult = explode(decompressReadBuf, decompressWriteBuf);
    
    console.log(`\n📖 Decompression: ${decompressResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Decompressed: ${Array.from(decompressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Compare
    const sizesMatch = testData.length === decompressedData.length;
    const dataMatches = sizesMatch && testData.every((byte, index) => byte === decompressedData[index]);
    
    console.log(`\n🔍 Results:`);
    console.log(`Size match: ${sizesMatch ? '✅' : '❌'} (${testData.length} vs ${decompressedData.length})`);
    console.log(`Data match: ${dataMatches ? '✅' : '❌'}`);
    
    if (!dataMatches && sizesMatch) {
      console.log(`\n❌ Data corruption:`);
      for (let i = 0; i < Math.min(testData.length, decompressedData.length); i++) {
        if (testData[i] !== decompressedData[i]) {
          console.log(`  Byte ${i}: expected 0x${testData[i].toString(16)} got 0x${decompressedData[i].toString(16)}`);
        }
      }
    }
    
    if (dataMatches) {
      console.log(`🎉 SUCCESS! Literals-only compression works perfectly!`);
    }
    
    expect(compressResult.success).toBe(true);
    expect(decompressResult.success).toBe(true);
    expect(dataMatches).toBe(true);
  });
});
