import { implode } from '../src/implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';

// Monkey patch to debug repetitions
let originalWriteDistance: any;
let originalWriteLiteral: any;

// Add debug logging
const loggedCalls: Array<{type: string, data: any}> = [];

// Patch the functions for debugging
function patchForDebugging() {
  // We'll need to modify the functions temporarily for debugging
  console.log('Patching functions for debugging...');
}

describe('Debug Repetition Finding', () => {
  beforeAll(() => {
    patchForDebugging();
  });

  it('should debug what repetitions are found', () => {
    // Simple test case that's causing problems
    const testData = new Uint8Array([0x56, 0x45, 0x52, 0x20, 0x02, 0x00, 0x00, 0x00]);
    
    console.log(`\n🔍 Analyzing input: ${Array.from(testData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`Positions:           ${Array.from(testData).map((_, i) => i.toString().padStart(2, ' ')).join(' ')}`);
    
    // Look for obvious repetitions manually
    console.log(`\n📋 Manual repetition analysis:`);
    for (let i = 0; i < testData.length - 1; i++) {
      for (let j = i + 1; j < testData.length; j++) {
        if (testData[i] === testData[j]) {
          console.log(`  Match found: pos ${i} and ${j} both have 0x${testData[i].toString(16)} (distance ${j-i})`);
          
          // Check for longer matches
          let length = 1;
          while (i + length < testData.length && 
                 j + length < testData.length && 
                 testData[i + length] === testData[j + length]) {
            length++;
          }
          if (length > 1) {
            console.log(`    Extended match: ${length} bytes`);
          }
        }
      }
    }
    
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
      const available = Math.min(bytesToRead, testData.length - readIndex);
      if (available <= 0) return 0;
      
      buffer.set(testData.slice(readIndex, readIndex + available));
      readIndex += available;
      return available;
    };

    const result = implode(
      compressReadBuf,
      compressWriteBuf,
      CMP_BINARY,
      ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3
    );

    console.log(`\n📦 Compression result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Compressed: ${Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    expect(result.success).toBe(true);
  });
});
