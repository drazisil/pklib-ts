import { explode } from '../explode/explode';
import { CMP_ASCII, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

describe('ASCII Table Debug', () => {
  test('should debug ASCII table generation', () => {
    console.log('\n🔍 ASCII Table Debug:');
    
    // Create a dummy decompression to get the tables generated
    const dummyData = new Uint8Array([1, 6, 34, 0, 0, 0, 0, 0, 0, 0]);
    let dataIndex = 0;
    const readBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, Math.min(10, dummyData.length - dataIndex));
      if (available <= 0) return 0;
      
      buffer.set(dummyData.slice(dataIndex, dataIndex + available));
      dataIndex += available;
      return available;
    };

    let decompressedData: Uint8Array = new Uint8Array(0);
    const writeBuf = (data: Uint8Array, bytesToWrite: number): number => {
      return bytesToWrite; // Just discard
    };

    // This will generate the tables and then fail, but that's okay
    try {
      explode(readBuf, writeBuf);
    } catch (e) {
      // Expected to fail
    }
    
    // Now check the key table entries
    console.log('\n🔍 Key table entries:');
    console.log(`offs2C34[0x10]: ${0}`); // We can't access internal state easily
    console.log(`offs2D34[0x01]: ${0}`); // Character 124 should be here
    console.log(`offs2D34[0x21]: ${0}`); // Character 106 should be here
    
    // Instead, let's check what the decoding gives us for specific bit patterns
    console.log('\n🔍 Let\'s check the actual data where the mismatch occurs...');
    
    const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
    const compressedPath = path.join(originalDir, 'large.imploded.ascii');
    const compressedData = fs.readFileSync(compressedPath);
    
    // Look at the compressed data around the positions that decode to the wrong character
    console.log(`Compressed data length: ${compressedData.length}`);
    console.log(`First 20 bytes: ${Array.from(compressedData.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    
    expect(true).toBe(true);
  });
});
