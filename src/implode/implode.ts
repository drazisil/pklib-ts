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
  LenCode,
  ExLenBits
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
 * Flush output buffer - matches C code exactly
 */
function flushBuf(pWork: CompressionStruct): void {
  const size = 0x800;
  pWork.writeFunc(pWork.outBuff.slice(0, size), size);

  const saveCh1 = pWork.outBuff[0x800];
  const saveCh2 = pWork.outBuff[pWork.outBytes];
  pWork.outBytes -= 0x800;

  pWork.outBuff.fill(0);

  if (pWork.outBytes !== 0) {
    pWork.outBuff[0] = saveCh1;
  }
  if (pWork.outBits !== 0) {
    pWork.outBuff[pWork.outBytes] = saveCh2;
  }
}

/**
 * Output bits to the compressed stream - matches C code exactly
 */
function outputBits(pWork: CompressionStruct, nbits: number, bitBuff: number): void {
  let outBits: number;

  // Ensure bitBuff is within safe integer range for bitwise operations
  bitBuff = bitBuff >>> 0; // Convert to unsigned 32-bit integer

  // If more than 8 bits to output, do recursion (exactly like C code)
  if (nbits > 8) {
    outputBits(pWork, 8, bitBuff);
    bitBuff >>= 8;  // Use signed right shift like C code
    nbits -= 8;
    // Continue with the rest of the function for remaining bits
  }

  // Add bits to the last out byte in out_buff; (exactly like C code)
  outBits = pWork.outBits;
  pWork.outBuff[pWork.outBytes] |= (bitBuff << outBits) & 0xFF;
  pWork.outBits += nbits;

  // If 8 or more bits, increment number of bytes (exactly like C code)
  if (pWork.outBits > 8) {
    pWork.outBytes++;
    bitBuff >>= (8 - outBits);  // Use signed right shift like C code
    
    pWork.outBuff[pWork.outBytes] = bitBuff & 0xFF;
    pWork.outBits &= 7;
  } else {
    pWork.outBits &= 7;
    if (pWork.outBits === 0) {
      pWork.outBytes++;
    }
  }

  // If there is enough compressed bytes, flush them
  if (pWork.outBytes >= 0x800) {
    flushBuf(pWork);
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
 * Encode literal byte - matches C code exactly
 */
function writeLiteral(pWork: CompressionStruct, byte: number): void {
  // Output literal using character codes directly
  outputBits(pWork, pWork.nChBits[byte], pWork.nChCodes[byte]);
}

/**
 * Encode repetition - matches C code exactly
 */
function writeDistance(pWork: CompressionStruct, distance: number, length: number): void {
  // Output length code (rep_length + 0xFE)
  const lengthIndex = length + 0xFE;
  outputBits(pWork, pWork.nChBits[lengthIndex], pWork.nChCodes[lengthIndex]);
  
  // Output distance
  if (length === 2) {
    // For length 2, use 2-bit encoding
    outputBits(pWork, pWork.distBits[distance >>> 2], pWork.distCodes[distance >>> 2]);
    outputBits(pWork, 2, distance & 3);
  } else {
    // For length > 2, use dictionary size encoding
    outputBits(pWork, pWork.distBits[distance >>> pWork.dsizeBits], pWork.distCodes[distance >>> pWork.dsizeBits]);
    outputBits(pWork, pWork.dsizeBits, pWork.dsizeMask & distance);
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

    // Initialize character tables like C code
    if (compressionType === CMP_BINARY) {
      // Binary mode: 9 bits for literals
      for (let nCount = 0; nCount < 0x100; nCount++) {
        pWork.nChBits[nCount] = 9;
        pWork.nChCodes[nCount] = nCount * 2;
      }
    } else {
      // ASCII mode: use Huffman encoding (simplified for now)
      for (let nCount = 0; nCount < 0x100; nCount++) {
        pWork.nChBits[nCount] = 9; // Simplified to 9 bits
        pWork.nChCodes[nCount] = nCount * 2;
      }
    }

    // Initialize length codes (matches C code exactly)
    let nCount = 0x100;
    for (let i = 0; i < 0x10; i++) {
      for (let nCount2 = 0; nCount2 < (1 << ExLenBits[i]); nCount2++) {
        pWork.nChBits[nCount] = ExLenBits[i] + LenBits[i] + 1;
        pWork.nChCodes[nCount] = (nCount2 << (LenBits[i] + 1)) | ((LenCode[i] & 0xFFFF00FF) * 2) | 1;
        nCount++;
      }
    }

    // Copy distance tables
    pWork.distBits.set(DistBits);
    pWork.distCodes.set(DistCode);

    // Initialize ASCII tables if needed
    if (compressionType === CMP_ASCII) {
      initAsciiTables(pWork);
    }

    // Initialize output buffer like C code
    // Write header: compression type and dictionary size bits only
    pWork.outBuff[0] = compressionType;
    pWork.outBuff[1] = pWork.dsizeBits;
    pWork.outBytes = 2;  // Start writing compressed data from byte 2
    
    // Reset remaining output buffer to zero
    pWork.outBuff.fill(0, 2);
    
    // Initialize bit buffer properly
    pWork.outBits = 0;
    
    let totalInput = 0;
    
    // Main compression loop - process input in chunks
    const inputBuffer = new Uint8Array(0x1000);
    let bufferPos = 0;
    
    while (true) {
      // Read input data directly into work buffer
      const bytesRead = readBuf(inputBuffer, inputBuffer.length);
      if (bytesRead === 0) {
        break; // No more input
      }
      
      totalInput += bytesRead;
      
      // Copy input to work buffer for processing
      pWork.workBuff.set(inputBuffer.slice(0, bytesRead), bufferPos);
      const endPos = bufferPos + bytesRead;
      
      // Build hash table for this chunk
      if (endPos > 1) {
        sortBuffer(pWork, bufferPos, endPos);
      }
      
      // Compress the data
      for (let i = bufferPos; i < endPos; ) {
        if (i < endPos - 1) { // Need at least 2 bytes for repetition search
          const rep = findRep(pWork, i);
          
          // Apply same checks as C code to avoid problematic repetitions
          if (rep.length >= 2 && rep.distance > 0) {
            // If we got repetition of 2 bytes, that is 0x100 or more backward, don't bother
            if (rep.length === 2 && rep.distance >= 0x100) {
              // Output literal instead
              writeLiteral(pWork, pWork.workBuff[i]);
              i++;
            }
            // Only avoid the specific self-referencing case (distance < length) that causes infinite loops
            else if (rep.distance < rep.length) {
              // Output literal instead  
              writeLiteral(pWork, pWork.workBuff[i]);
              i++;
            }
            else {
              // Implement C code's look-ahead strategy
              if (rep.length >= 8 || i + 1 >= endPos) {
                // Use current repetition
                writeDistance(pWork, rep.distance, rep.length);
                i += rep.length;
              } else {
                // Try to find better repetition 1 byte later (like C code)
                const saveRepLength = rep.length;
                const saveDistance = rep.distance;
                const nextRep = findRep(pWork, i + 1);
                
                // Only use the new repetition if it's length is greater than the previous one
                if (nextRep.length > saveRepLength) {
                  // If the new repetition is only 1 byte better
                  // and the previous distance is less than 0x80 bytes, use the previous repetition
                  if (nextRep.length > saveRepLength + 1 || saveDistance > 0x80) {
                    // Flush one byte, so that we point to the secondary repetition
                    writeLiteral(pWork, pWork.workBuff[i]);
                    i++;
                    continue;
                  }
                }
                
                // Revert to the previous repetition and use it
                writeDistance(pWork, saveDistance, saveRepLength);
                i += saveRepLength;
              }
            }
          } else {
            // Output literal
            writeLiteral(pWork, pWork.workBuff[i]);
            i++;
          }
        } else {
          // Last byte, output as literal
          writeLiteral(pWork, pWork.workBuff[i]);
          i++;
        }
      }
      
      // Prepare for next chunk - keep some overlap for better compression
      bufferPos = Math.min(endPos, 0x1000);
      if (bufferPos > 0 && endPos < pWork.workBuff.length) {
        pWork.workBuff.copyWithin(0, endPos - bufferPos, endPos);
        bufferPos = 0;
      }
    }
    
    // Write end-of-stream marker (matches C code exactly)
    outputBits(pWork, pWork.nChBits[0x305], pWork.nChCodes[0x305]);
    
    // Flush remaining bits like C code
    if (pWork.outBits !== 0) {
      pWork.outBytes++;
    }

    // Write the complete output buffer (header + compressed data)
    writeBuf(pWork.outBuff.slice(0, pWork.outBytes), pWork.outBytes);

    return {
      success: true,
      errorCode: PklibErrorCode.CMP_NO_ERROR,
      compressedSize: pWork.outBytes,
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
