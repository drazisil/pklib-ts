import * as fs from 'fs';
import { implode } from '../implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../types';

describe('Compression Comparison Test', () => {
  it('should compare our compression output with PKLib output byte by byte', async () => {
    // Read original binary data
    const originalData = fs.readFileSync('test-fixtures/binary.decomp');
    const expectedCompressed = fs.readFileSync('test-fixtures/binary.imploded');
    
    console.log(`\n🔍 Comparing compression outputs:`);
    console.log(`  Original: ${originalData.length} bytes`);
    console.log(`  PKLib compressed: ${expectedCompressed.length} bytes`);
    
    // Our compression
    let ourCompressed: Uint8Array = new Uint8Array(0);
    let totalRead = 0;
    
    const result = implode(
      (buf: Uint8Array, bytesToRead: number): number => {
        const remaining = originalData.length - totalRead;
        const toRead = Math.min(bytesToRead, remaining);
        if (toRead > 0) {
          buf.set(originalData.slice(totalRead, totalRead + toRead));
          totalRead += toRead;
        }
        return toRead;
      },
      (buf: Uint8Array, size: number) => {
        const newCompressed = new Uint8Array(ourCompressed.length + size);
        newCompressed.set(ourCompressed);
        newCompressed.set(buf.slice(0, size), ourCompressed.length);
        ourCompressed = newCompressed;
      },
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3  // Use largest dict for best compression
    );
    
    console.log(`  Our compressed: ${ourCompressed.length} bytes`);
    console.log(`  Size difference: ${ourCompressed.length - expectedCompressed.length} bytes`);
    
    if (ourCompressed.length === 0) {
      console.log(`❌ Compression failed`);
      return;
    }
    
    // Compare headers
    console.log(`\n🔍 Header comparison:`);
    console.log(`  PKLib: [${Array.from(expectedCompressed.slice(0, 10)).join(', ')}]`);
    console.log(`  Ours:  [${Array.from(ourCompressed.slice(0, 10)).join(', ')}]`);
    
    // Find first difference
    const maxLength = Math.min(ourCompressed.length, expectedCompressed.length);
    let firstDiff = -1;
    
    for (let i = 0; i < maxLength; i++) {
      if (ourCompressed[i] !== expectedCompressed[i]) {
        firstDiff = i;
        break;
      }
    }
    
    if (firstDiff === -1) {
      if (ourCompressed.length === expectedCompressed.length) {
        console.log(`✅ Files are identical!`);
      } else {
        console.log(`📏 Files match up to ${maxLength} bytes, but different lengths`);
        if (ourCompressed.length > expectedCompressed.length) {
          console.log(`  Our file has ${ourCompressed.length - expectedCompressed.length} extra bytes`);
        } else {
          console.log(`  Our file is missing ${expectedCompressed.length - ourCompressed.length} bytes`);
        }
      }
    } else {
      console.log(`\n🚨 First difference at byte ${firstDiff}:`);
      console.log(`  PKLib: 0x${expectedCompressed[firstDiff].toString(16).padStart(2, '0')} (${expectedCompressed[firstDiff]})`);
      console.log(`  Ours:  0x${ourCompressed[firstDiff].toString(16).padStart(2, '0')} (${ourCompressed[firstDiff]})`);
      
      // Show context around the difference
      const start = Math.max(0, firstDiff - 5);
      const end = Math.min(maxLength, firstDiff + 6);
      
      console.log(`\n📍 Context (bytes ${start}-${end-1}):`);
      console.log(`  PKLib: [${Array.from(expectedCompressed.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);
      console.log(`  Ours:  [${Array.from(ourCompressed.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);
    }
    
    // Calculate match percentage
    let matches = 0;
    for (let i = 0; i < maxLength; i++) {
      if (ourCompressed[i] === expectedCompressed[i]) {
        matches++;
      }
    }
    
    const matchPercentage = (matches / maxLength * 100).toFixed(2);
    console.log(`\n📊 Match: ${matches}/${maxLength} bytes (${matchPercentage}%)`);
  });
});
