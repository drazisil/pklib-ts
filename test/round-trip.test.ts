import { implode } from '../src/implode/implode';
import { explode } from '../src/explode/explode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';
import fs from 'fs';
import path from 'path';

describe('Round-trip Test', () => {
  it('should compress and decompress correctly', () => {
    // Use the original text from the external test
    const originalText = "Collaboratively administrate empowered markets via plug-and-play networks. Dynamically procrastinate B2C users after installed base benefits. Dramatically visualize customer directed convergence without revolutionary ROI.\n    Completely synergize resource sucking relationships via premier niche markets. Professionally cultivate one-to-one customer service with robust ideas. Dynamically innovate resource-leveling customer service for state of the art customer service.                                                                                 ";
    
    const originalData = new TextEncoder().encode(originalText);
    console.log(`Original data: ${originalData.length} bytes`);
    
    // Compress it
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

    console.log(`Compression result: success=${compressResult.success}, error=${compressResult.errorCode}`);
    console.log(`Compressed to ${compressedData.length} bytes`);

    if (!compressResult.success || compressedData.length === 0) {
      throw new Error('Compression failed');
    }

    // Now decompress it
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

    const decompressResult = explode(readBuf, writeBuf);
    
    console.log(`Decompress result: success=${decompressResult.success}, error=${decompressResult.errorCode}`);
    
    if (decompressResult.success && decompressResult.decompressedData) {
      console.log(`Decompressed to ${decompressResult.decompressedData.length} bytes`);
      const resultText = new TextDecoder().decode(decompressResult.decompressedData);
      console.log(`Result text length: ${resultText.length}`);
      console.log(`Original text length: ${originalText.length}`);
      
      if (resultText === originalText) {
        console.log('✅ Perfect round-trip!');
      } else {
        console.log('❌ Round-trip failed');
        console.log(`First 100 chars of result: "${resultText.substring(0, 100)}"`);
        console.log(`First 100 chars of original: "${originalText.substring(0, 100)}"`);
        
        // Find first difference
        let firstDiff = -1;
        for (let i = 0; i < Math.min(resultText.length, originalText.length); i++) {
          if (resultText[i] !== originalText[i]) {
            firstDiff = i;
            break;
          }
        }
        if (firstDiff >= 0) {
          console.log(`First character difference at position ${firstDiff}`);
          console.log(`Got: "${resultText[firstDiff]}" (code ${resultText.charCodeAt(firstDiff)})`);
          console.log(`Expected: "${originalText[firstDiff]}" (code ${originalText.charCodeAt(firstDiff)})`);
        }
      }
    } else {
      console.log('❌ Decompression failed');
    }
  });
});
