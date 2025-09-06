import { explode } from '../explode/explode';
import { implode } from '../implode/implode';
import { CMP_ASCII, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

describe('ASCII Fixture Critical Test', () => {
  const originalDir = path.join(__dirname, '../../test-fixtures');
  
  test('should decompress ASCII fixture perfectly', () => {
    console.log('\n🧪 Testing ASCII fixture decompression:');
    
    // Load the large ASCII fixture (PKLib compressed)
    const compressedPath = path.join(originalDir, 'large.imploded.ascii');
    const expectedPath = path.join(originalDir, 'large.decomp');
    
    const compressedData = fs.readFileSync(compressedPath);
    const expectedData = fs.readFileSync(expectedPath);
    
    console.log(`  Compressed: ${compressedData.length} bytes`);
    console.log(`  Expected: ${expectedData.length} bytes`);
    console.log(`  Header: [${compressedData[0]}, ${compressedData[1]}, ${compressedData[2]}]`);
    
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

    // Test our decompression of PKLib's ASCII compressed data
    const result = explode(
      readBuf,
      writeBuf
    );
    
    console.log(`  Result: success=${result.success}, error=${result.errorCode}`);
    console.log(`  Decompressed: ${decompressedData.length} bytes`);
    
    expect(result.success).toBe(true);
    expect(result.errorCode).toBe(0);
    expect(decompressedData.length).toBe(expectedData.length);
    
    // Check byte-by-byte match
    let matches = 0;
    let firstMismatch = -1;
    
    for (let i = 0; i < expectedData.length; i++) {
      if (decompressedData[i] === expectedData[i]) {
        matches++;
      } else if (firstMismatch === -1) {
        firstMismatch = i;
      }
    }
    
    const matchPercent = (matches / expectedData.length * 100).toFixed(2);
    console.log(`  Match: ${matches}/${expectedData.length} bytes (${matchPercent}%)`);
    
    if (firstMismatch !== -1) {
      console.log(`  ❌ First mismatch at byte ${firstMismatch}: expected ${expectedData[firstMismatch]} got ${decompressedData[firstMismatch]}`);
    } else {
      console.log(`  ✅ ASCII decompression: PERFECT`);
    }
    
    expect(decompressedData).toEqual(expectedData);
  });

  test('should compress ASCII data and decompress back correctly', () => {
    console.log('\n🧪 Testing ASCII round-trip compression:');
    
    // Load original data
    const originalPath = path.join(originalDir, 'large.decomp');
    const originalData = fs.readFileSync(originalPath);
    console.log(`  Original: ${originalData.length} bytes`);
    
    // Compress the data
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
      CMP_ASCII,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3 // Use largest dict for best compression
    );

    console.log(`  Compression: success=${compressResult.success}, error=${compressResult.errorCode}`);
    console.log(`  Compressed to: ${compressedData.length} bytes`);
    console.log(`  Compression ratio: ${((1 - compressedData.length / originalData.length) * 100).toFixed(1)}%`);
    
    expect(compressResult.success).toBe(true);
    expect(compressResult.errorCode).toBe(0);
    expect(compressedData.length).toBeGreaterThan(0);
    
    // Test decompression of our compressed data
    let decompDataIndex = 0;
    const decompReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, compressedData.length - decompDataIndex);
      if (available <= 0) return 0;
      
      buffer.set(compressedData.slice(decompDataIndex, decompDataIndex + available));
      decompDataIndex += available;
      return available;
    };

    let decompressedData: Uint8Array = new Uint8Array(0);
    const decompWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(decompressedData.length + chunk.length);
      newData.set(decompressedData);
      newData.set(chunk, decompressedData.length);
      decompressedData = newData;
      return bytesToWrite;
    };

    const decompressionResult = explode(
      decompReadBuf,
      decompWriteBuf
    );
    
    console.log(`  Decompression: success=${decompressionResult.success}, error=${decompressionResult.errorCode}`);
    console.log(`  Decompressed: ${decompressedData.length} bytes`);
    
    expect(decompressionResult.success).toBe(true);
    expect(decompressionResult.errorCode).toBe(0);
    expect(decompressedData.length).toBe(originalData.length);
    
    // Check perfect round-trip
    let matches = 0;
    let firstMismatch = -1;
    
    for (let i = 0; i < originalData.length; i++) {
      if (decompressedData[i] === originalData[i]) {
        matches++;
      } else if (firstMismatch === -1) {
        firstMismatch = i;
        console.log(`  🔍 First mismatch at byte ${i}: original ${originalData[i]} (${String.fromCharCode(originalData[i])}) vs decompressed ${decompressedData[i]} (${String.fromCharCode(decompressedData[i])})`);
      }
    }
    
    const matchPercent = (matches / originalData.length * 100).toFixed(2);
    console.log(`  Match: ${matches}/${originalData.length} bytes (${matchPercent}%)`);
    
    if (matches === originalData.length) {
      console.log(`  ✅ ASCII round-trip: PERFECT`);
    } else {
      console.log(`  ❌ ASCII round-trip: PARTIAL (${matchPercent}%)`);
    }
    
    expect(decompressedData).toEqual(originalData);
  });
});
