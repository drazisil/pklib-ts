/**
 * Tests for implode (compression) functionality
 */

import { implode, getImplodeSizeConstants } from '../src/implode/implode';
import { 
  PklibErrorCode, 
  CMP_BINARY, 
  CMP_ASCII,
  ImplodeDictSizes,
  ReadFunction,
  WriteFunction 
} from '../src/types';

describe('Implode (Compression)', () => {
  describe('getImplodeSizeConstants', () => {
    it('should return correct size constants', () => {
      const constants = getImplodeSizeConstants();
      
      expect(constants.own_size).toBe(20);
      expect(constants.internal_struct_size).toBe(36312);
      expect(constants.OFFSS_SIZE2).toBe(0x204);
      expect(constants.LITERALS_COUNT).toBe(0x306);
      expect(constants.HASHTABLE_SIZE).toBe(0x900);
    });
  });

  describe('implode function', () => {
    it('should handle invalid dictionary size', () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      let inputPos = 0;
      const outputChunks: Uint8Array[] = [];

      const readFunc: ReadFunction = (buffer, size) => {
        const remainingBytes = inputData.length - inputPos;
        const bytesToRead = Math.min(size, remainingBytes);
        
        if (bytesToRead > 0) {
          buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
          inputPos += bytesToRead;
        }
        
        return bytesToRead;
      };

      const writeFunc: WriteFunction = (buffer, size) => {
        outputChunks.push(buffer.slice(0, size));
      };

      const result = implode(readFunc, writeFunc, CMP_BINARY, 999); // Invalid dict size
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PklibErrorCode.CMP_INVALID_DICTSIZE);
    });

    it('should handle empty input', () => {
      let inputPos = 0;
      const outputChunks: Uint8Array[] = [];

      const readFunc: ReadFunction = (buffer, size) => {
        return 0; // No data available
      };

      const writeFunc: WriteFunction = (buffer, size) => {
        outputChunks.push(buffer.slice(0, size));
      };

      const result = implode(readFunc, writeFunc, CMP_BINARY, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1);
      
      // Should handle empty input gracefully
      expect(result.success).toBe(true);
      expect(result.errorCode).toBe(PklibErrorCode.CMP_NO_ERROR);
      expect(result.originalSize).toBe(0);
    });

    it('should accept valid dictionary sizes', () => {
      const inputData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      let inputPos = 0;
      const outputChunks: Uint8Array[] = [];

      const readFunc: ReadFunction = (buffer, size) => {
        const remainingBytes = inputData.length - inputPos;
        const bytesToRead = Math.min(size, remainingBytes);
        
        if (bytesToRead > 0) {
          buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
          inputPos += bytesToRead;
        }
        
        return bytesToRead;
      };

      const writeFunc: WriteFunction = (buffer, size) => {
        outputChunks.push(buffer.slice(0, size));
      };

      // Test all valid dictionary sizes
      const validSizes = [
        ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1,
        ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2,
        ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3
      ];

      for (const dictSize of validSizes) {
        inputPos = 0; // Reset input position
        const result = implode(readFunc, writeFunc, CMP_BINARY, dictSize);
        
        // Should not fail with invalid dictionary size error
        expect(result.errorCode).not.toBe(PklibErrorCode.CMP_INVALID_DICTSIZE);
        expect(result.success).toBe(true);
      }
    });

    it('should work with both compression types', () => {
      const inputData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      let inputPos = 0;
      const outputChunks: Uint8Array[] = [];

      const readFunc: ReadFunction = (buffer, size) => {
        const remainingBytes = inputData.length - inputPos;
        const bytesToRead = Math.min(size, remainingBytes);
        
        if (bytesToRead > 0) {
          buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
          inputPos += bytesToRead;
        }
        
        return bytesToRead;
      };

      const writeFunc: WriteFunction = (buffer, size) => {
        outputChunks.push(buffer.slice(0, size));
      };

      // Test binary compression
      inputPos = 0;
      const binaryResult = implode(readFunc, writeFunc, CMP_BINARY, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1);
      expect(binaryResult.success).toBe(true);
      expect(binaryResult.errorCode).toBe(PklibErrorCode.CMP_NO_ERROR);

      // Test ASCII compression
      inputPos = 0;
      const asciiResult = implode(readFunc, writeFunc, CMP_ASCII, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1);
      expect(asciiResult.success).toBe(true);
      expect(asciiResult.errorCode).toBe(PklibErrorCode.CMP_NO_ERROR);
    });

    it('should compress simple data', () => {
      const inputData = new Uint8Array([65, 65, 65, 65, 65]); // "AAAAA" - should compress well
      let inputPos = 0;
      const outputChunks: Uint8Array[] = [];

      const readFunc: ReadFunction = (buffer, size) => {
        const remainingBytes = inputData.length - inputPos;
        const bytesToRead = Math.min(size, remainingBytes);
        
        if (bytesToRead > 0) {
          buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
          inputPos += bytesToRead;
        }
        
        return bytesToRead;
      };

      const writeFunc: WriteFunction = (buffer, size) => {
        outputChunks.push(buffer.slice(0, size));
      };

      const result = implode(readFunc, writeFunc, CMP_BINARY, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1);
      
      expect(result.success).toBe(true);
      expect(result.errorCode).toBe(PklibErrorCode.CMP_NO_ERROR);
      expect(result.originalSize).toBe(inputData.length);
      expect(typeof result.compressedSize).toBe('number');
    });

    it('should handle larger data blocks', () => {
      // Create a larger test dataset with repetitive patterns
      const pattern = new Uint8Array([1, 2, 3, 4, 5]);
      const inputData = new Uint8Array(1000);
      for (let i = 0; i < inputData.length; i++) {
        inputData[i] = pattern[i % pattern.length];
      }
      
      let inputPos = 0;
      const outputChunks: Uint8Array[] = [];

      const readFunc: ReadFunction = (buffer, size) => {
        const remainingBytes = inputData.length - inputPos;
        const bytesToRead = Math.min(size, remainingBytes);
        
        if (bytesToRead > 0) {
          buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
          inputPos += bytesToRead;
        }
        
        return bytesToRead;
      };

      const writeFunc: WriteFunction = (buffer, size) => {
        outputChunks.push(buffer.slice(0, size));
      };

      const result = implode(readFunc, writeFunc, CMP_BINARY, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2);
      
      expect(result.success).toBe(true);
      expect(result.errorCode).toBe(PklibErrorCode.CMP_NO_ERROR);
      expect(result.originalSize).toBe(inputData.length);
      expect(typeof result.compressedSize).toBe('number');
    });
  });
});

describe('Error handling', () => {
  it('should handle read function errors gracefully', () => {
    const readFunc: ReadFunction = (buffer, size) => {
      throw new Error('Read error');
    };

    const writeFunc: WriteFunction = (buffer, size) => {
      // Do nothing
    };

    const result = implode(readFunc, writeFunc, CMP_BINARY, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1);
    
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PklibErrorCode.CMP_BAD_DATA);
  });

  it('should handle write function errors gracefully', () => {
    const inputData = new Uint8Array([72, 101, 108, 108, 111]);
    let inputPos = 0;

    const readFunc: ReadFunction = (buffer, size) => {
      const remainingBytes = inputData.length - inputPos;
      const bytesToRead = Math.min(size, remainingBytes);
      
      if (bytesToRead > 0) {
        buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
        inputPos += bytesToRead;
      }
      
      return bytesToRead;
    };

    const writeFunc: WriteFunction = (buffer, size) => {
      throw new Error('Write error');
    };

    const result = implode(readFunc, writeFunc, CMP_BINARY, ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1);
    
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PklibErrorCode.CMP_BAD_DATA);
  });
});
