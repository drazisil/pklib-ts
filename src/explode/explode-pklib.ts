/**
 * PKLib-compatible explode function that handles header parsing internally
 * This matches the C API more closely by handling the initial bit buffer properly
 */

import { 
  PklibErrorCode, 
  ReadFunction, 
  WriteFunction, 
  DecompressionResult,
  CMP_BINARY,
  CMP_ASCII,
  ExplodeSizesEnum,
  LUTSizesEnum,
  PKDCL_OK,
  PKDCL_STREAM_END
} from '../types';
import { BitStream } from '../common/BitStream';
import { SlidingWindow } from '../common/SlidingWindow';
import { 
  DistBits, 
  DistCode, 
  ExLenBits, 
  LenBase, 
  LenBits, 
  LenCode,
  ChBitsAsc,
  ChCodeAsc
} from '../PKWareLUT/PKWareLUTs';

/**
 * Decompression work structure for PKLib-compatible API
 */
class PKLibDecompressionStruct {
  public ctype: number = 0;           // Compression type (CMP_BINARY or CMP_ASCII)
  public outputPos: number = 0;       // Position in output buffer
  public dsizeBits: number = 0;       // Dict size (4, 5, 6 for 0x400, 0x800, 0x1000)
  public dsizeMask: number = 0;       // Dict size bitmask
  
  public bitStream: BitStream;
  public slidingWindow: SlidingWindow;
  
  // Decode tables
  public distPosCodes: Uint8Array = new Uint8Array(ExplodeSizesEnum.CODES_SIZE);
  public lengthCodes: Uint8Array = new Uint8Array(ExplodeSizesEnum.CODES_SIZE);
  public offs2C34: Uint8Array = new Uint8Array(ExplodeSizesEnum.OFFSS_SIZE);
  public offs2D34: Uint8Array = new Uint8Array(ExplodeSizesEnum.OFFSS_SIZE);
  public offs2E34: Uint8Array = new Uint8Array(ExplodeSizesEnum.OFFSS_SIZE1);
  public offs2EB4: Uint8Array = new Uint8Array(ExplodeSizesEnum.OFFSS_SIZE);
  public chBitsAscWork: Uint8Array = new Uint8Array(LUTSizesEnum.CH_BITS_ASC_SIZE);
  public distBits: Uint8Array = new Uint8Array(LUTSizesEnum.DIST_SIZES);
  public lenBits: Uint8Array = new Uint8Array(LUTSizesEnum.LENS_SIZES);
  public exLenBits: Uint8Array = new Uint8Array(LUTSizesEnum.LENS_SIZES);
  public lenBase: Uint16Array = new Uint16Array(LUTSizesEnum.LENS_SIZES);

  constructor(readFunc: ReadFunction) {
    this.bitStream = new BitStream(readFunc);
    this.slidingWindow = new SlidingWindow(0x2204); // BUFF_SIZE from types
    
    // Initialize tables with default values
    this.distBits.set(DistBits);
    this.lenBits.set(LenBits);
    this.exLenBits.set(ExLenBits);
    this.lenBase.set(LenBase);
    this.chBitsAscWork.set(ChBitsAsc);
  }
}

/**
 * PKLib-compatible explode function that reads the header from the input stream
 * This matches the original C API where the header is part of the compressed data
 */
export function explodePKLib(
  readBuf: ReadFunction,
  writeBuf: WriteFunction
): DecompressionResult {
  try {
    // First, read enough data to get the header
    const initialBuffer = new Uint8Array(512); // Read a reasonable chunk initially
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
    
    console.log(`Header: type=${compressionType}, dictBits=${dictionarySizeBits}, initBits=0x${initialBitBuffer.toString(16)}`);
    
    // Validate compression type
    if (compressionType !== CMP_BINARY && compressionType !== CMP_ASCII) {
      return {
        success: false,
        errorCode: PklibErrorCode.CMP_INVALID_MODE
      };
    }
    
    // Validate dictionary size
    if (dictionarySizeBits < 4 || dictionarySizeBits > 6) {
      return {
        success: false,
        errorCode: PklibErrorCode.CMP_INVALID_DICTSIZE
      };
    }
    
    // Create a read function that provides the remaining data
    let position = 3; // Skip the header
    const remainingInitialData = initialBuffer.slice(3, initialBytesRead);
    let initialDataUsed = false;
    
    const wrappedReadBuf: ReadFunction = (buffer: Uint8Array, size: number): number => {
      if (!initialDataUsed && remainingInitialData.length > 0) {
        // First, provide the remaining data from the initial read
        const bytesToCopy = Math.min(size, remainingInitialData.length);
        buffer.set(remainingInitialData.slice(0, bytesToCopy));
        if (bytesToCopy < remainingInitialData.length) {
          // We didn't use all the initial data, need to track this properly
          console.log(`Warning: Initial buffer not fully consumed`);
        }
        initialDataUsed = true;
        
        // If we need more data, read it
        if (bytesToCopy < size) {
          const additionalBytes = readBuf(buffer.slice(bytesToCopy), size - bytesToCopy);
          return bytesToCopy + additionalBytes;
        }
        return bytesToCopy;
      } else {
        // Read fresh data
        return readBuf(buffer, size);
      }
    };
    
    // Create the decompression work structure
    const pWork = new PKLibDecompressionStruct(wrappedReadBuf);
    
    // Set up the work structure to match C implementation
    pWork.ctype = compressionType;
    pWork.dsizeBits = dictionarySizeBits;
    pWork.dsizeMask = 0xFFFF >> (0x10 - dictionarySizeBits);
    
    // Initialize the bit stream with the initial bit buffer
    pWork.bitStream.initializeBitBuffer(initialBitBuffer);
    
    console.log(`PKLib setup complete: type=${compressionType}, dictBits=${dictionarySizeBits}, mask=0x${pWork.dsizeMask.toString(16)}`);
    
    // This is a simplified version - we'd need to implement the full decompression here
    // For now, return an error to indicate we need more work
    return {
      success: false,
      errorCode: PklibErrorCode.CMP_BAD_DATA
    };
    
  } catch (error) {
    console.error('PKLib explode error:', error);
    return {
      success: false,
      errorCode: PklibErrorCode.CMP_ABORT
    };
  }
}

export { explodePKLib as explode };
