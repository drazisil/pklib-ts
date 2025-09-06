/**
 * Implode (compression) implementation - TypeScript port
 * Based on implode.c from pklib by Ladislav Zezula
 */

import { 
  PklibErrorCode, 
  ReadFunction, 
  WriteFunction, 
  CompressionResult,
  ImplodeSizesEnum,
  ImplodeDictSizes,
  CMP_BINARY,
  CMP_ASCII,
  LUTSizesEnum
} from '../types';
import { 
  DistBits, 
  DistCode, 
  LenBits, 
  LenCode
} from '../PKWareLUT/PKWareLUTs';

const MAX_REP_LENGTH = 0x204; // Maximum repetition length

/**
 * Compression work structure
 */
class CompressionStruct {
  public distance: number = 0;          // Backward distance of found repetition
  public outBytes: number = 0;          // Bytes available in output buffer
  public outBits: number = 0;           // Bits available in last output byte
  public dsizeBits: number = 0;         // Number of bits for dictionary size
  public dsizeMask: number = 0;         // Bit mask for dictionary
  public ctype: number = 0;             // Compression type
  public dsizeBytes: number = 0;        // Dictionary size in bytes
  
  public distBits: Uint8Array = new Uint8Array(LUTSizesEnum.DIST_SIZES);
  public distCodes: Uint8Array = new Uint8Array(LUTSizesEnum.DIST_SIZES);
  public nChBits: Uint8Array = new Uint8Array(ImplodeSizesEnum.LITERALS_COUNT);
  public nChCodes: Uint16Array = new Uint16Array(ImplodeSizesEnum.LITERALS_COUNT);
  
  public readFunc: ReadFunction;
  public writeFunc: WriteFunction;
  
  public outBuff: Uint8Array = new Uint8Array(0x802); // OUT_BUFF_SIZE
  public workBuff: Uint8Array = new Uint8Array(0x2204); // BUFF_SIZE
  public phashToIndex: Uint16Array = new Uint16Array(ImplodeSizesEnum.HASHTABLE_SIZE);
  public phashOffs: Uint16Array = new Uint16Array(0x2204); // BUFF_SIZE

  constructor(readFunc: ReadFunction, writeFunc: WriteFunction) {
    this.readFunc = readFunc;
    this.writeFunc = writeFunc;
    
    // Initialize tables
    this.distBits.set(DistBits);
    this.distCodes.set(DistCode);
  }
}

/**
 * Macro for calculating hash of byte pair
 */
function bytePairHash(buffer: Uint8Array, offset: number): number {
  return (buffer[offset] * 4) + (buffer[offset + 1] * 5);
}

/**
 * Sort buffer and build hash tables
 */
function sortBuffer(pWork: CompressionStruct, bufferBegin: number, bufferEnd: number): void {
  let totalSum = 0;
  
  // Zero the hash-to-index table
  pWork.phashToIndex.fill(0);
  
  // Step 1: Count occurrences of each PAIR_HASH
  for (let bufferPtr = bufferBegin; bufferPtr < bufferEnd; bufferPtr++) {
    const hash = bytePairHash(pWork.workBuff, bufferPtr) % ImplodeSizesEnum.HASHTABLE_SIZE;
    pWork.phashToIndex[hash]++;
  }
  
  // Step 2: Convert to cumulative counts
  for (let i = 0; i < ImplodeSizesEnum.HASHTABLE_SIZE; i++) {
    totalSum += pWork.phashToIndex[i];
    pWork.phashToIndex[i] = totalSum;
  }
  
  // Step 3: Build offset table
  for (let bufferEnd2 = bufferEnd - 1; bufferEnd2 >= bufferBegin; bufferEnd2--) {
    const byteHash = bytePairHash(pWork.workBuff, bufferEnd2) % ImplodeSizesEnum.HASHTABLE_SIZE;
    const byteOffs = bufferEnd2;
    
    pWork.phashToIndex[byteHash]--;
    pWork.phashOffs[pWork.phashToIndex[byteHash]] = byteOffs;
  }
}

/**
 * Flush output buffer
 */
function flushBuf(pWork: CompressionStruct): void {
  const flushSize = 0x800;
  pWork.writeFunc(pWork.outBuff.slice(0, flushSize), flushSize);
  
  const saveCh1 = pWork.outBuff[flushSize];
  const saveCh2 = pWork.outBuff[pWork.outBytes];
  
  pWork.outBytes -= flushSize;
  pWork.outBuff.copyWithin(0, flushSize, flushSize + pWork.outBytes);
  
  pWork.outBuff[pWork.outBytes] = saveCh2;
}

/**
 * Output bits to the compressed stream
 */
function outputBits(pWork: CompressionStruct, nBits: number, bitBuff: number): void {
  // If not enough space for nBits, flush the buffer
  if (pWork.outBytes > 0x800 - 10) {
    flushBuf(pWork);
  }

  // Add new bits to bit buffer
  pWork.outBits += nBits;
  bitBuff <<= (32 - pWork.outBits);
  
  // Write complete bytes
  while (pWork.outBits >= 8) {
    pWork.outBuff[pWork.outBytes++] = (bitBuff >>> 24) & 0xFF;
    bitBuff <<= 8;
    pWork.outBits -= 8;
  }
}

/**
 * Find repetition in the dictionary
 */
function findRep(pWork: CompressionStruct, bufferPos: number): { length: number; distance: number } {
  const maxLength = Math.min(MAX_REP_LENGTH, pWork.workBuff.length - bufferPos);
  let bestLength = 1;
  let bestDistance = 0;
  
  if (maxLength < 2) {
    return { length: bestLength, distance: bestDistance };
  }
  
  const hash = bytePairHash(pWork.workBuff, bufferPos) % ImplodeSizesEnum.HASHTABLE_SIZE;
  const hashEnd = (hash < ImplodeSizesEnum.HASHTABLE_SIZE - 1) ? 
    pWork.phashToIndex[hash + 1] : pWork.phashOffs.length;
  
  // Search through all positions with the same hash
  for (let hashOffs = pWork.phashToIndex[hash]; hashOffs < hashEnd; hashOffs++) {
    const repOffs = pWork.phashOffs[hashOffs];
    
    if (repOffs >= bufferPos) {
      break; // Don't look ahead
    }
    
    const distance = bufferPos - repOffs;
    if (distance > pWork.dsizeBytes) {
      continue; // Too far back
    }
    
    // Check how many bytes match
    let length = 0;
    while (length < maxLength && 
           pWork.workBuff[bufferPos + length] === pWork.workBuff[repOffs + length]) {
      length++;
    }
    
    if (length > bestLength) {
      bestLength = length;
      bestDistance = distance;
    }
  }
  
  return { length: bestLength, distance: bestDistance };
}

/**
 * Encode literal byte
 */
function writeLiteral(pWork: CompressionStruct, byte: number): void {
  if (pWork.ctype === CMP_BINARY) {
    // Binary mode: output 0 bit + 8 bits of data
    outputBits(pWork, 1, 0);
    outputBits(pWork, 8, byte);
  } else {
    // ASCII mode: use Huffman encoding
    outputBits(pWork, 1, 0);
    outputBits(pWork, pWork.nChBits[byte], pWork.nChCodes[byte]);
  }
}

/**
 * Encode repetition
 */
function writeDistance(pWork: CompressionStruct, distance: number, length: number): void {
  // Output 1 bit to indicate repetition
  outputBits(pWork, 1, 1);
  
  // Encode length
  const lengthCode = length - 2;
  if (lengthCode < LUTSizesEnum.LENS_SIZES) {
    outputBits(pWork, LenBits[lengthCode], LenCode[lengthCode]);
  }
  
  // Encode distance
  let distCode = 0;
  for (let i = 0; i < LUTSizesEnum.DIST_SIZES; i++) {
    if (distance <= (1 << DistBits[i])) {
      distCode = i;
      break;
    }
  }
  
  outputBits(pWork, DistBits[distCode], DistCode[distCode]);
  
  if (length === 2) {
    // Special handling for 2-byte repetitions
    const extraBits = DistBits[distCode] - 2;
    if (extraBits > 0) {
      outputBits(pWork, extraBits, distance - (1 << (DistBits[distCode] - extraBits)));
    }
  } else {
    // Normal repetition
    const extraBits = DistBits[distCode] - pWork.dsizeBits;
    if (extraBits > 0) {
      outputBits(pWork, extraBits, distance - (1 << (DistBits[distCode] - extraBits)));
    }
  }
}

/**
 * Initialize compression tables for ASCII mode
 */
function initAsciiTables(pWork: CompressionStruct): void {
  // For simplicity, use fixed Huffman table lengths
  // In a complete implementation, these would be calculated based on frequency analysis
  for (let i = 0; i < ImplodeSizesEnum.LITERALS_COUNT; i++) {
    if (i >= 32 && i <= 126) {
      // Printable ASCII characters get shorter codes
      pWork.nChBits[i] = 7;
      pWork.nChCodes[i] = i - 32;
    } else {
      // Non-printable characters get longer codes
      pWork.nChBits[i] = 9;
      pWork.nChCodes[i] = (i < 32) ? i + 256 : i + 128;
    }
  }
}

/**
 * Main implode (compression) function
 */
export function implode(
  readBuf: ReadFunction,
  writeBuf: WriteFunction,
  compressionType: number,
  dictionarySize: number
): CompressionResult {
  try {
    const pWork = new CompressionStruct(readBuf, writeBuf);
    
    // Set compression type
    pWork.ctype = compressionType;
    
    // Set dictionary size parameters
    switch (dictionarySize) {
      case ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1:
        pWork.dsizeBits = 4;
        pWork.dsizeMask = 0x0F;
        pWork.dsizeBytes = 1024;
        break;
      case ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2:
        pWork.dsizeBits = 5;
        pWork.dsizeMask = 0x1F;
        pWork.dsizeBytes = 2048;
        break;
      case ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3:
        pWork.dsizeBits = 6;
        pWork.dsizeMask = 0x3F;
        pWork.dsizeBytes = 4096;
        break;
      default:
        return {
          success: false,
          errorCode: PklibErrorCode.CMP_INVALID_DICTSIZE
        };
    }

    // Initialize ASCII tables if needed
    if (compressionType === CMP_ASCII) {
      initAsciiTables(pWork);
    }

    let totalInput = 0;
    let totalOutput = 0;
    
    // Main compression loop
    while (true) {
      // Read input data
      const bytesRead = readBuf(pWork.workBuff.slice(0x1000), 0x1000);
      if (bytesRead === 0) {
        break; // No more input
      }
      
      totalInput += bytesRead;
      
      // Sort buffer for hash table
      sortBuffer(pWork, 0x1000, 0x1000 + bytesRead);
      
      // Compress the data
      for (let i = 0x1000; i < 0x1000 + bytesRead; ) {
        const rep = findRep(pWork, i);
        
        if (rep.length >= 2) {
          // Output repetition
          writeDistance(pWork, rep.distance, rep.length);
          i += rep.length;
        } else {
          // Output literal
          writeLiteral(pWork, pWork.workBuff[i]);
          i++;
        }
      }
      
      // Move remaining data to beginning of buffer
      pWork.workBuff.copyWithin(0, 0x1000, 0x1000 + bytesRead);
    }
    
    // Write end-of-stream marker
    outputBits(pWork, 1, 1); // Repetition marker
    outputBits(pWork, LenBits[LUTSizesEnum.LENS_SIZES - 1], LenCode[LUTSizesEnum.LENS_SIZES - 1]); // Max length code for EOS
    
    // Flush remaining bits
    if (pWork.outBits > 0) {
      outputBits(pWork, 8 - pWork.outBits, 0);
    }
    
    // Flush final buffer
    if (pWork.outBytes > 0) {
      writeBuf(pWork.outBuff.slice(0, pWork.outBytes), pWork.outBytes);
      totalOutput += pWork.outBytes;
    }

    return {
      success: true,
      errorCode: PklibErrorCode.CMP_NO_ERROR,
      compressedSize: totalOutput,
      originalSize: totalInput
    };

  } catch (error) {
    return {
      success: false,
      errorCode: PklibErrorCode.CMP_BAD_DATA
    };
  }
}

/**
 * Utility function to get implode size constants
 */
export function getImplodeSizeConstants(): {
  own_size: number;
  internal_struct_size: number;
  OFFSS_SIZE2: number;
  LITERALS_COUNT: number;
  HASHTABLE_SIZE: number;
} {
  return {
    own_size: 20,
    internal_struct_size: 36312,
    OFFSS_SIZE2: ImplodeSizesEnum.OFFSS_SIZE2,
    LITERALS_COUNT: ImplodeSizesEnum.LITERALS_COUNT,
    HASHTABLE_SIZE: ImplodeSizesEnum.HASHTABLE_SIZE,
  };
}
