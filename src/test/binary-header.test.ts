import { implode } from '../implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

describe('Binary Header Comparison', () => {
  it('should produce correct binary header', () => {
    // Use the original binary data
    const originalDir = '/data/Code/pklib/tests/testDataset/implode-decoder';
    const originalData = fs.readFileSync(path.join(originalDir, 'binary.decomp'));
    const externalCompressed = fs.readFileSync(path.join(originalDir, 'binary.imploded'));
    
    console.log(`\n🧪 Binary header comparison:`);
    console.log(`External file header: [${externalCompressed[0]}, ${externalCompressed[1]}, ${externalCompressed[2]}]`);
    console.log(`External compression type: ${externalCompressed[0]}`);
    console.log(`External dict size bits: ${externalCompressed[1]}`);
    console.log(`External initial bit buffer: 0x${externalCompressed[2].toString(16)}`);
    
    // Compress with our implementation
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

    // Try different dictionary sizes to match external
    const dictSizes = [
      { name: 'DICT_SIZE1 (4 bits)', value: ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1, bits: 4 },
      { name: 'DICT_SIZE2 (5 bits)', value: ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2, bits: 5 },
      { name: 'DICT_SIZE3 (6 bits)', value: ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3, bits: 6 }
    ];

    for (const dictSize of dictSizes) {
      readIndex = 0; // Reset for each attempt
      compressedData = new Uint8Array(0);
      
      const result = implode(
        compressReadBuf,
        compressWriteBuf,
        CMP_BINARY,
        dictSize.value
      );

      if (result.success && compressedData.length > 0) {
        console.log(`\n${dictSize.name}:`);
        console.log(`  Our header: [${compressedData[0]}, ${compressedData[1]}, ${compressedData[2]}]`);
        console.log(`  Size: ${compressedData.length} bytes (external: ${externalCompressed.length})`);
        
        const headerMatch = compressedData[0] === externalCompressed[0] && 
                           compressedData[1] === externalCompressed[1];
        
        if (headerMatch) {
          console.log(`  ✅ Header matches! (compression type and dict size)`);
          
          if (compressedData.length === externalCompressed.length) {
            console.log(`  ✅ Size matches perfectly!`);
            
            // Compare first 10 bytes
            let bytesMatch = 0;
            for (let i = 0; i < Math.min(10, compressedData.length); i++) {
              if (compressedData[i] === externalCompressed[i]) {
                bytesMatch++;
              }
            }
            console.log(`  First 10 bytes match: ${bytesMatch}/10`);
            
          } else {
            console.log(`  ❌ Size differs: our ${compressedData.length} vs external ${externalCompressed.length}`);
          }
        } else {
          console.log(`  ❌ Header differs`);
        }
      } else {
        console.log(`\n${dictSize.name}: Compression failed`);
      }
    }
  });
});
