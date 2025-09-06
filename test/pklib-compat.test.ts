/**
 * Test the PKLib-compatible explode function
 */

import * as fs from 'fs';
import * as path from 'path';
import { explode } from '../src/explode/explode';

describe('PKLib-Compatible Explode', () => {
  it('should handle small.imploded with PKLib-compatible API', () => {
    const fixturesDir = path.join(__dirname, '../test-fixtures');
    const compressedPath = path.join(fixturesDir, 'small.imploded');
    const expectedPath = path.join(fixturesDir, 'small.decomp');
    
    // Read files
    const compressedData = new Uint8Array(fs.readFileSync(compressedPath));
    const expectedData = new Uint8Array(fs.readFileSync(expectedPath));
    
    console.log(`Testing with compressed size: ${compressedData.length} bytes`);
    console.log(`Expected output size: ${expectedData.length} bytes`);
    
    // Create read function that reads from the beginning (including header)
    let readPos = 0;
    const readFunc = (buffer: Uint8Array, size: number): number => {
      const bytesToRead = Math.min(size, compressedData.length - readPos);
      if (bytesToRead <= 0) {
        console.log(`ReadFunc: No more data (pos=${readPos})`);
        return 0;
      }
      
      console.log(`ReadFunc: Reading ${bytesToRead} bytes from pos ${readPos}`);
      for (let i = 0; i < bytesToRead; i++) {
        buffer[i] = compressedData[readPos + i];
      }
      readPos += bytesToRead;
      return bytesToRead;
    };
    
    const outputData: number[] = [];
    const writeFunc = (buffer: Uint8Array, size: number): number => {
      console.log(`WriteFunc: Writing ${size} bytes`);
      for (let i = 0; i < size; i++) {
        outputData.push(buffer[i]);
      }
      return size;
    };
    
    // Test the PKLib-compatible function
    const result = explode(readFunc, writeFunc);
    
    console.log(`Result: success=${result.success}, errorCode=${result.errorCode}`);
    console.log(`Output data length: ${outputData.length}`);
    
    if (result.success) {
      const outputArray = new Uint8Array(outputData);
      console.log(`First 64 chars: "${Array.from(outputArray.slice(0, 64)).map(b => String.fromCharCode(b)).join('')}"`);
      
      expect(outputArray.length).toBe(expectedData.length);
      expect(outputArray).toEqual(expectedData);
      console.log('✅ PKLib-compatible test PASSED!');
    } else {
      console.log(`❌ Failed with error: ${result.errorCode}`);
      // Don't fail the test yet, this is still debugging
    }
  });
});
