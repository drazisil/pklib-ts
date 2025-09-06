import { implode } from '../src/implode/implode';
import { CMP_BINARY, ImplodeDictSizes } from '../src/types';

describe('OutputBits Debug', () => {
  it('should debug outputBits calls', () => {
    // Create a simple test case to debug outputBits
    const testData = new Uint8Array([0x56, 0x45, 0x52, 0x20]); // "VER "
    
    console.log(`\n🔬 Testing compression of: ${Array.from(testData).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
    console.log(`Characters: ${Array.from(testData).map(b => String.fromCharCode(b)).join('')}`);
    
    let compressedData: Uint8Array = new Uint8Array(0);
    const compressWriteBuf = (data: Uint8Array, bytesToWrite: number): number => {
      const chunk = data.slice(0, bytesToWrite);
      const newData = new Uint8Array(compressedData.length + chunk.length);
      newData.set(compressedData);
      newData.set(chunk, compressedData.length);
      compressedData = newData;
      console.log(`📤 WriteBuf called: writing ${bytesToWrite} bytes: ${Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      return bytesToWrite;
    };

    let readIndex = 0;
    const compressReadBuf = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, testData.length - readIndex);
      if (available <= 0) {
        console.log(`📥 ReadBuf called: no more data available (read ${readIndex}/${testData.length})`);
        return 0;
      }
      
      buffer.set(testData.slice(readIndex, readIndex + available));
      console.log(`📥 ReadBuf called: reading ${available} bytes from offset ${readIndex}: ${Array.from(testData.slice(readIndex, readIndex + available)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
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
    console.log(`Final compressed data: ${Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  });
});
