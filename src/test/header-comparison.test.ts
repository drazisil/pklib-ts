import { implode } from '../implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';
import fs from 'fs';
import path from 'path';

describe('Header Comparison', () => {
  it('should compare headers with external file', () => {
    // Compress our test data
    const originalText = "Collaboratively administrate empowered markets via plug-and-play networks. Dynamically procrastinate B2C users after installed base benefits. Dramatically visualize customer directed convergence without revolutionary ROI.\n    Completely synergize resource sucking relationships via premier niche markets. Professionally cultivate one-to-one customer service with robust ideas. Dynamically innovate resource-leveling customer service for state of the art customer service.                                                                                 ";
    const originalData = new TextEncoder().encode(originalText);
    
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
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1  // Use 4 bits like external file
    );

    console.log(`Our compression: success=${compressResult.success}, ${compressedData.length} bytes`);
    
    // Read external file
    const testFile = path.join(__dirname, '../../../pklib/tests/testDataset/implode-decoder/small.imploded');
    const externalData = fs.readFileSync(testFile);
    
    console.log(`External file: ${externalData.length} bytes`);
    
    // Compare headers (first 10 bytes)
    console.log('\nOur header:');
    for (let i = 0; i < Math.min(10, compressedData.length); i++) {
      console.log(`  [${i}]: 0x${compressedData[i].toString(16).padStart(2, '0')} (${compressedData[i]})`);
    }
    
    console.log('\nExternal header:');
    for (let i = 0; i < Math.min(10, externalData.length); i++) {
      console.log(`  [${i}]: 0x${externalData[i].toString(16).padStart(2, '0')} (${externalData[i]})`);
    }
    
    // Check if first 3 bytes match (header)
    if (compressedData.length >= 3 && externalData.length >= 3) {
      const ourHeader = compressedData.slice(0, 3);
      const extHeader = externalData.slice(0, 3);
      
      console.log(`\nHeader comparison:`);
      console.log(`Our header: [${ourHeader[0]}, ${ourHeader[1]}, ${ourHeader[2]}]`);
      console.log(`Ext header: [${extHeader[0]}, ${extHeader[1]}, ${extHeader[2]}]`);
      
      if (ourHeader[0] === extHeader[0] && ourHeader[1] === extHeader[1] && ourHeader[2] === extHeader[2]) {
        console.log('✅ Headers match!');
      } else {
        console.log('❌ Headers differ');
        
        if (ourHeader[0] !== extHeader[0]) {
          console.log(`  Compression type differs: our=${ourHeader[0]}, ext=${extHeader[0]}`);
        }
        if (ourHeader[1] !== extHeader[1]) {
          console.log(`  Dict size differs: our=${ourHeader[1]}, ext=${extHeader[1]}`);
        }
        if (ourHeader[2] !== extHeader[2]) {
          console.log(`  Initial bit buffer differs: our=${ourHeader[2]}, ext=${extHeader[2]}`);
        }
      }
    }
  });
});
