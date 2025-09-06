import { explode } from '../explode/explode';
import fs from 'fs';
import path from 'path';

describe('External File Test', () => {
  it('should decompress external file correctly', () => {
    // Use the small test file
    const testFile = path.join(__dirname, '../../../pklib/tests/testDataset/implode-decoder/small.imploded');
    const expectedFile = path.join(__dirname, '../../../pklib/tests/testDataset/implode-decoder/small.decomp');
    
    const compressedData = fs.readFileSync(testFile);
    const expectedData = fs.readFileSync(expectedFile);
    
    console.log(`Compressed file: ${compressedData.length} bytes`);
    console.log(`Expected output: ${expectedData.length} bytes`);
    console.log(`Expected text: "${new TextDecoder().decode(expectedData)}"`);
    
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
      console.log(`WriteBuf called: ${bytesToWrite} bytes, total: ${totalWritten}`);
      return bytesToWrite;
    };

    const result = explode(readBuf, writeBuf);
    
    console.log(`Decompress result: success=${result.success}, error=${result.errorCode}`);
    
    if (result.success && result.decompressedData) {
      console.log(`Decompressed to ${result.decompressedData.length} bytes`);
      const resultText = new TextDecoder().decode(result.decompressedData);
      console.log(`Result text: "${resultText}"`);
      
      if (result.decompressedData.length === expectedData.length) {
        console.log(`✅ Correct length: ${result.decompressedData.length} bytes`);
        
        // Compare byte by byte
        let matches = 0;
        let firstDiff = -1;
        for (let i = 0; i < expectedData.length; i++) {
          if (result.decompressedData[i] === expectedData[i]) {
            matches++;
          } else if (firstDiff === -1) {
            firstDiff = i;
          }
        }
        
        console.log(`Byte matches: ${matches}/${expectedData.length}`);
        if (firstDiff >= 0) {
          console.log(`First difference at byte ${firstDiff}: got 0x${result.decompressedData[firstDiff].toString(16)}, expected 0x${expectedData[firstDiff].toString(16)}`);
        }
        
        if (matches === expectedData.length) {
          console.log('✅ Perfect match!');
        }
      } else {
        console.log(`❌ Length mismatch: got ${result.decompressedData.length}, expected ${expectedData.length}`);
      }
    } else {
      console.log('❌ Decompression failed');
    }
  });
});
