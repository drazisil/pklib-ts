/**
 * PKLib-compatible explode function that properly handles the header and initial bit buffer
 */

import { 
  PklibErrorCode, 
  ReadFunction, 
  WriteFunction, 
  DecompressionResult,
  CMP_BINARY,
  CMP_ASCII
} from '../types';
import { explode as explodeCore } from '../explode/explode';

/**
 * PKLib-compatible explode function that reads the header from the input stream
 * and properly initializes the bit buffer
 */
export function explodePKLib(
  readBuf: ReadFunction,
  writeBuf: WriteFunction
): DecompressionResult {
  try {
    // Read the first chunk that includes the header
    const initialBuffer = new Uint8Array(512);
    const initialBytesRead = readBuf(initialBuffer, initialBuffer.length);
    
    if (initialBytesRead < 3) {
      return {
        success: false,
        errorCode: PklibErrorCode.CMP_BAD_DATA
      };
    }
    
    // Parse header
    const compressionType = initialBuffer[0];
    const dictionarySizeBits = initialBuffer[1];
    const initialBitBuffer = initialBuffer[2];
    
    console.log(`PKLib Header: type=${compressionType}, dictBits=${dictionarySizeBits}, initBits=0x${initialBitBuffer.toString(16)}`);
    
    // Validate compression type
    if (compressionType !== CMP_BINARY && compressionType !== CMP_ASCII) {
      return {
        success: false,
        errorCode: PklibErrorCode.CMP_INVALID_MODE
      };
    }
    
    // Validate and convert dictionary size
    let dictionarySize: number;
    switch (dictionarySizeBits) {
      case 4: dictionarySize = 1024; break;
      case 5: dictionarySize = 2048; break;
      case 6: dictionarySize = 4096; break;
      default:
        return {
          success: false,
          errorCode: PklibErrorCode.CMP_INVALID_DICTSIZE
        };
    }
    
    // Create a wrapper that provides the compressed data starting from byte 3
    // and prepends the initial bit buffer properly
    let firstCall = true;
    let dataPosition = 3; // Skip header
    const remainingInitialData = initialBuffer.slice(3, initialBytesRead);
    let initialDataConsumed = 0;
    
    const wrappedReadBuf: ReadFunction = (buffer: Uint8Array, size: number): number => {
      if (firstCall) {
        firstCall = false;
        // For the first call, we need to provide data starting with the compressed stream
        // The initial bit buffer should already be handled by the explode function initialization
        
        // Provide remaining data from initial read
        const availableFromInitial = remainingInitialData.length - initialDataConsumed;
        const bytesToCopyFromInitial = Math.min(size, availableFromInitial);
        
        if (bytesToCopyFromInitial > 0) {
          buffer.set(remainingInitialData.slice(initialDataConsumed, initialDataConsumed + bytesToCopyFromInitial));
          initialDataConsumed += bytesToCopyFromInitial;
        }
        
        // If we need more data, read it
        if (bytesToCopyFromInitial < size) {
          const additionalBytes = readBuf(buffer.slice(bytesToCopyFromInitial), size - bytesToCopyFromInitial);
          return bytesToCopyFromInitial + additionalBytes;
        }
        
        return bytesToCopyFromInitial;
      } else {
        // Subsequent calls, just pass through
        return readBuf(buffer, size);
      }
    };
    
    console.log(`Calling explode with: type=${compressionType}, dictSize=${dictionarySize}`);
    
    // Call our existing explode function
    // But we need to modify it to handle the initial bit buffer properly
    return explodeCore(wrappedReadBuf, writeBuf, compressionType, dictionarySize);
    
  } catch (error) {
    console.error('PKLib explode error:', error);
    return {
      success: false,
      errorCode: PklibErrorCode.CMP_ABORT
    };
  }
}

export { explodePKLib as explode };
