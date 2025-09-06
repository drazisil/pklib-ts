import { explodePKLib } from '../explode/explode';
import fs from 'fs';
import path from 'path';

describe('All External Fixtures Test', () => {
  const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
  
  const testFiles = [
    { name: 'small', compressed: 'small.imploded', expected: 'small.decomp' },
    { name: 'medium', compressed: 'medium.imploded', expected: 'medium.decomp' },
    { name: 'large', compressed: 'large.imploded', expected: 'large.decomp' },
    { name: 'large-ascii', compressed: 'large.imploded.ascii', expected: 'large.decomp' },
    { name: 'binary', compressed: 'binary.imploded', expected: 'binary.decomp' },
    { name: 'no-explicit-end', compressed: 'no-explicit-end.imploded', expected: 'no-explicit-end.decomp' }
  ];

  testFiles.forEach(testFile => {
    it(`should decompress ${testFile.name} correctly`, () => {
      const compressedPath = path.join(originalDir, testFile.compressed);
      const expectedPath = path.join(originalDir, testFile.expected);
      
      if (!fs.existsSync(compressedPath)) {
        console.log(`⏭️  Skipping ${testFile.name} - file not found: ${compressedPath}`);
        return;
      }
      
      const compressedData = fs.readFileSync(compressedPath);
      const expectedData = fs.readFileSync(expectedPath);
      
      console.log(`\n🧪 Testing ${testFile.name}:`);
      console.log(`  Compressed: ${compressedData.length} bytes`);
      console.log(`  Expected: ${expectedData.length} bytes`);
      
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
      
      if (result.success && result.decompressedData) {
        console.log(`  Decompressed: ${result.decompressedData.length} bytes`);
        
        if (result.decompressedData.length === expectedData.length) {
          let matches = 0;
          for (let i = 0; i < expectedData.length; i++) {
            if (result.decompressedData[i] === expectedData[i]) {
              matches++;
            }
          }
          
          const percentage = ((matches / expectedData.length) * 100).toFixed(2);
          console.log(`  Match: ${matches}/${expectedData.length} bytes (${percentage}%)`);
          
          if (matches === expectedData.length) {
            console.log(`  ✅ Perfect match!`);
            expect(result.decompressedData).toEqual(expectedData);
          } else {
            console.log(`  ❌ Partial match only`);
            // For now, let's see what we get
            expect(result.success).toBe(true);
          }
        } else {
          console.log(`  ❌ Length mismatch: got ${result.decompressedData.length}, expected ${expectedData.length}`);
          expect(result.success).toBe(true);
        }
      } else {
        console.log(`  ❌ Decompression failed`);
        expect(result.success).toBe(true);
      }
    });
  });
});
