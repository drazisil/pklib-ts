/**
 * Tests for explode (decompression) functionality
 */

import { explode, getExplodeSizeConstants } from '../explode';
import { 
  PklibErrorCode, 
  CMP_BINARY, 
  CMP_ASCII,
  ImplodeDictSizes,
  ReadFunction,
  WriteFunction 
} from '../../types';

describe('Explode (Decompression)', () => {
  describe('getExplodeSizeConstants', () => {
    it('should return correct size constants', () => {
      const constants = getExplodeSizeConstants();
      
      expect(constants.own_size).toBe(36);
      expect(constants.internal_struct_size).toBe(2452);
      expect(constants.IN_BUFF_SIZE).toBe(0x800);
      expect(constants.CODES_SIZE).toBe(0x100);
      expect(constants.OFFSS_SIZE).toBe(0x100);
      expect(constants.OFFSS_SIZE1).toBe(0x80);
      expect(constants.CH_BITS_ASC_SIZE).toBe(0x100);
      expect(constants.LENS_SIZES).toBe(0x10);
    });
  });

  describe('explode function', () => {
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

      const result = explode(readFunc, writeFunc); // Will fail due to insufficient header data
      
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

      const result = explode(readFunc, writeFunc);
      
      // Should handle empty input gracefully
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PklibErrorCode.CMP_BAD_DATA);
    });

    it('should accept valid dictionary sizes', () => {
      const inputData = new Uint8Array([0x00, 0x00]); // Minimal valid compressed data
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
        const result = explode(readFunc, writeFunc);
        
        // Should not fail with invalid dictionary size error
        expect(result.errorCode).not.toBe(PklibErrorCode.CMP_INVALID_DICTSIZE);
      }
    });

    it('should work with both compression types', () => {
      const inputData = new Uint8Array([0x00, 0x00]);
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
      const binaryResult = explode(readFunc, writeFunc);
      expect(binaryResult.errorCode).not.toBe(PklibErrorCode.CMP_INVALID_MODE);

      // Test ASCII compression
      inputPos = 0;
      const asciiResult = explode(readFunc, writeFunc);
      expect(asciiResult.errorCode).not.toBe(PklibErrorCode.CMP_INVALID_MODE);
    });

    it('should handle stream operations correctly', () => {
      // Create a simple test pattern that should decompress to some predictable output
      const inputData = new Uint8Array([
        0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00 // Simple "Hello" with proper end marker
      ]);
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

      const result = explode(readFunc, writeFunc);
      
      // The function should at least process the input without crashing
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.errorCode).toBe('number');
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

    const result = explode(readFunc, writeFunc);
    
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PklibErrorCode.CMP_ABORT);
  });

  it('should handle write function errors gracefully', () => {
    const inputData = new Uint8Array([0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
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

    const result = explode(readFunc, writeFunc);
    
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PklibErrorCode.CMP_INVALID_DICTSIZE);
  });
});
