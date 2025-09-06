import { explodePKLib } from '../explode/explode';
import { implode } from '../implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

describe('Binary Fixture Critical Test', () => {
  const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
  
  it('should decompress binary fixture perfectly', () => {
    const compressedPath = path.join(originalDir, 'binary.imploded');
    const expectedPath = path.join(originalDir, 'binary.decomp');
    
    const compressedData = fs.readFileSync(compressedPath);
    const expectedData = fs.readFileSync(expectedPath);
    
    console.log(`\n🧪 Testing BINARY fixture decompression:`);
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

    let totalWritten = 0;
    const writeBuf = (data: Uint8Array, bytesToWrite: number): number => {
      totalWritten += bytesToWrite;
      return bytesToWrite;
    };

    const result = explodePKLib(readBuf, writeBuf);
    
    console.log(`  Result: success=${result.success}, error=${result.errorCode}`);
    console.log(`  Decompressed: ${result.decompressedData?.length} bytes`);
    
    expect(result.success).toBe(true);
    expect(result.decompressedData).toBeDefined();
    expect(result.decompressedData!.length).toBe(expectedData.length);
    expect(result.decompressedData).toEqual(expectedData);
    
    console.log(`  ✅ Binary decompression: PERFECT`);
  });

  it('should compress binary data and decompress back correctly', () => {
    // Use the original binary data as input
    const originalPath = path.join(originalDir, 'binary.decomp');
    const originalData = fs.readFileSync(originalPath);
    
    console.log(`\n🧪 Testing BINARY round-trip compression:`);
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
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3 // Use largest dict for best compression
    );

    console.log(`  Compression: success=${compressResult.success}, error=${compressResult.errorCode}`);
    console.log(`  Compressed to: ${compressedData.length} bytes`);
    console.log(`  Compression ratio: ${((1 - compressedData.length / originalData.length) * 100).toFixed(1)}%`);
    
    expect(compressResult.success).toBe(true);
    expect(compressedData.length).toBeGreaterThan(0);
    
    // Now decompress it back
    let decompressIndex = 0;
    const decompressReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, compressedData.length - decompressIndex);
      if (available <= 0) return 0;
      
      buffer.set(compressedData.slice(decompressIndex, decompressIndex + available));
      decompressIndex += available;
      return available;
    };

    let totalWritten = 0;
    const decompressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      totalWritten += bytesToWrite;
      return bytesToWrite;
    };

    const decompressResult = explodePKLib(decompressReadBuf, decompressWriteBuf);
    
    console.log(`  Decompression: success=${decompressResult.success}, error=${decompressResult.errorCode}`);
    console.log(`  Decompressed: ${decompressResult.decompressedData?.length} bytes`);
    
    expect(decompressResult.success).toBe(true);
    expect(decompressResult.decompressedData).toBeDefined();
    
    if (decompressResult.decompressedData) {
      const matches = Array.from(originalData).reduce((count, byte, i) => 
        count + (decompressResult.decompressedData![i] === byte ? 1 : 0), 0);
      
      const percentage = ((matches / originalData.length) * 100).toFixed(2);
      console.log(`  Match: ${matches}/${originalData.length} bytes (${percentage}%)`);
      
      if (matches === originalData.length && decompressResult.decompressedData.length === originalData.length) {
        console.log(`  ✅ Binary round-trip: PERFECT`);
        expect(decompressResult.decompressedData).toEqual(originalData);
      } else {
        console.log(`  ❌ Binary round-trip: FAILED`);
        console.log(`    Length: got ${decompressResult.decompressedData.length}, expected ${originalData.length}`);
        
        // Show first few bytes for debugging
        const firstDiff = Array.from(originalData).findIndex((byte, i) => 
          decompressResult.decompressedData![i] !== byte);
        if (firstDiff >= 0) {
          console.log(`    First difference at byte ${firstDiff}: got 0x${decompressResult.decompressedData[firstDiff].toString(16)}, expected 0x${originalData[firstDiff].toString(16)}`);
        }
        
        // For now, let's see what level of accuracy we have
        expect(percentage).toEqual('100.00'); // This will fail but show us the actual percentage
      }
    }
  });
});
