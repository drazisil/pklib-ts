/**
 * Explode (decompression) implementation - TypeScript port
 * Based on explode.c from pklib by Ladislav Zezula
 */

import { 
  PklibErrorCode, 
  ReadFunction, 
  WriteFunction, 
  DecompressionResult,
  ExplodeSizesEnum,
  PKDCL_OK,
  PKDCL_STREAM_END,
  CMP_BINARY,
  CMP_ASCII,
  LUTSizesEnum
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
 * Decompression work structure
 */
class DecompressionStruct {
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
 * Generate decode tables for position codes
 */
function genDecodeTabs(
  positions: Uint8Array,
  startIndexes: Uint8Array,
  lengthBits: Uint8Array,
  elements: number
): void {
  for (let i = 0; i < elements; i++) {
    const length = 1 << lengthBits[i];
    for (let index = startIndexes[i]; index < 0x100; index += length) {
      positions[index] = i;
    }
  }
}

/**
 * Generate ASCII decode tables
 */
function genAscTabs(pWork: DecompressionStruct): void {
  for (let count = 0xFF; count >= 0; count--) {
    const pChCodeAsc = ChCodeAsc[count];
    let bitsAsc = pWork.chBitsAscWork[count];

    if (bitsAsc <= 8) {
      const add = 1 << bitsAsc;
      let acc = pChCodeAsc;

      while (acc < 0x100) {
        pWork.offs2C34[acc] = count;
        acc += add;
      }
    } else if ((pChCodeAsc & 0xFF) !== 0) {
      pWork.offs2C34[pChCodeAsc & 0xFF] = 0xFF;

      if (pChCodeAsc & 0x3F) {
        bitsAsc -= 4;
        pWork.chBitsAscWork[count] = bitsAsc;

        const add = 1 << bitsAsc;
        let acc = pChCodeAsc >> 4;
        while (acc < 0x100) {
          pWork.offs2D34[acc] = count;
          acc += add;
        }
      } else {
        bitsAsc -= 6;
        pWork.chBitsAscWork[count] = bitsAsc;

        const add = 1 << bitsAsc;
        let acc = pChCodeAsc >> 6;
        while (acc < 0x80) {
          pWork.offs2E34[acc] = count;
          acc += add;
        }
      }
    } else {
      bitsAsc -= 8;
      pWork.chBitsAscWork[count] = bitsAsc;

      const add = 1 << bitsAsc;
      let acc = pChCodeAsc >> 8;
      while (acc < 0x100) {
        pWork.offs2EB4[acc] = count;
        acc += add;
      }
    }
  }
}

/**
 * Decode next literal from input data
 * Returns: 0x000-0x0FF: literal byte values
 *          0x100-0x304: repetition lengths (0x02-0x206 bytes)
 *          0x305: end of stream
 *          0x306: error
 */
function decodeLit(pWork: DecompressionStruct): number {
  // Test the current bit in buffer
  if (pWork.bitStream.isCurrentBitSet()) {
    // Remove one bit from input data
    if (!pWork.bitStream.wasteBits(1)) {
      return 0x306; // Error
    }

    // Get length code from the next 8 bits
    const lengthCode = pWork.lengthCodes[pWork.bitStream.getBitBuffer() & 0xFF];

    // Remove the appropriate number of bits
    if (!pWork.bitStream.wasteBits(pWork.lenBits[lengthCode])) {
      return 0x306; // Error
    }

    // Check for extra bits
    const extraLengthBits = pWork.exLenBits[lengthCode];
    if (extraLengthBits !== 0) {
      const extraLength = pWork.bitStream.getBitBuffer() & ((1 << extraLengthBits) - 1);
      
      if (!pWork.bitStream.wasteBits(extraLengthBits)) {
        return 0x306; // Error
      }

      return pWork.lenBase[lengthCode] + extraLength + 0x100;
    }

    return pWork.lenBase[lengthCode] + 0x100;
  } else {
    // ASCII mode handling
    if (pWork.ctype === CMP_ASCII) {
      // Remove one bit
      if (!pWork.bitStream.wasteBits(1)) {
        return 0x306; // Error
      }

      // Decode using ASCII tables
      const bitBuffer = pWork.bitStream.getBitBuffer();
      if (pWork.offs2C34[bitBuffer & 0xFF] === 0xFF) {
        if ((bitBuffer & 0x3F) !== 0) {
          if (!pWork.bitStream.wasteBits(4)) {
            return 0x306; // Error
          }
          
          const count = pWork.offs2D34[(bitBuffer >> 4) & 0xFF];
          if (!pWork.bitStream.wasteBits(pWork.chBitsAscWork[count])) {
            return 0x306; // Error
          }
          
          return count;
        } else {
          if (!pWork.bitStream.wasteBits(6)) {
            return 0x306; // Error
          }
          
          const count = pWork.offs2E34[(bitBuffer >> 6) & 0x7F];
          if (!pWork.bitStream.wasteBits(pWork.chBitsAscWork[count])) {
            return 0x306; // Error
          }
          
          return count;
        }
      } else {
        const count = pWork.offs2C34[bitBuffer & 0xFF];
        if (!pWork.bitStream.wasteBits(pWork.chBitsAscWork[count])) {
          return 0x306; // Error
        }
        
        return count;
      }
    } else {
      // Binary mode - just remove one bit and return next 8 bits
      if (!pWork.bitStream.wasteBits(1)) {
        return 0x306; // Error
      }

      const result = pWork.bitStream.getBitBuffer() & 0xFF;
      if (!pWork.bitStream.wasteBits(8)) {
        return 0x306; // Error
      }

      return result;
    }
  }
}

/**
 * Decode distance for repetition
 */
function decodeDist(pWork: DecompressionStruct, length: number): number {
  if (length === 2) {
    // 2-byte repetition
    const distPosCode = pWork.distPosCodes[pWork.bitStream.getBitBuffer() & 0xFF];
    if (!pWork.bitStream.wasteBits(pWork.distBits[distPosCode])) {
      return 0; // Error
    }

    if (distPosCode !== 0) {
      const extraDistBits = pWork.distBits[distPosCode] - 2;
      const extraDist = pWork.bitStream.getBitBuffer() & ((1 << extraDistBits) - 1);
      
      if (!pWork.bitStream.wasteBits(extraDistBits)) {
        return 0; // Error
      }

      return ((1 << extraDistBits) + extraDist + DistCode[distPosCode]);
    }
    
    return DistCode[distPosCode];
  } else {
    // Longer repetition
    const distPosCode = pWork.distPosCodes[pWork.bitStream.getBitBuffer() & 0xFF];
    if (!pWork.bitStream.wasteBits(pWork.distBits[distPosCode])) {
      return 0; // Error
    }

    if (distPosCode !== 0) {
      const extraDistBits = pWork.distBits[distPosCode] - pWork.dsizeBits;
      const extraDist = pWork.bitStream.getBitBuffer() & ((1 << extraDistBits) - 1);
      
      if (!pWork.bitStream.wasteBits(extraDistBits)) {
        return 0; // Error
      }

      return ((1 << extraDistBits) + extraDist + DistCode[distPosCode]);
    }
    
    return DistCode[distPosCode];
  }
}

/**
 * Main explode (decompression) function
 */
export function explode(
  readBuf: ReadFunction,
  writeBuf: WriteFunction,
  compressionType: number,
  dictionarySize: number
): DecompressionResult {
  try {
    const pWork = new DecompressionStruct(readBuf);
    
    // Set compression type
    pWork.ctype = compressionType;
    
    // Set dictionary size parameters
    switch (dictionarySize) {
      case 1024:
        pWork.dsizeBits = 4;
        pWork.dsizeMask = 0x0F;
        break;
      case 2048:
        pWork.dsizeBits = 5;
        pWork.dsizeMask = 0x1F;
        break;
      case 4096:
        pWork.dsizeBits = 6;
        pWork.dsizeMask = 0x3F;
        break;
      default:
        return {
          success: false,
          errorCode: PklibErrorCode.CMP_INVALID_DICTSIZE
        };
    }

    // Generate decode tables
    genDecodeTabs(pWork.distPosCodes, DistCode, DistBits, LUTSizesEnum.DIST_SIZES);
    genDecodeTabs(pWork.lengthCodes, LenCode, LenBits, LUTSizesEnum.LENS_SIZES);
    
    if (compressionType === CMP_ASCII) {
      genAscTabs(pWork);
    }

    const outputBuffer = new Uint8Array(0x1000); // 4KB output buffer
    let totalOutput = 0;
    let outputChunks: Uint8Array[] = [];

    // Main decompression loop
    while (true) {
      const oneLiteral = decodeLit(pWork);
      
      if (oneLiteral === 0x306) {
        // Error
        return {
          success: false,
          errorCode: PklibErrorCode.CMP_BAD_DATA
        };
      }
      
      if (oneLiteral === 0x305) {
        // End of stream
        break;
      }
      
      if (oneLiteral < 0x100) {
        // Literal byte
        outputBuffer[pWork.outputPos] = oneLiteral;
        pWork.slidingWindow.writeByte(oneLiteral);
        pWork.outputPos++;
        
        if (pWork.outputPos >= outputBuffer.length) {
          outputChunks.push(outputBuffer.slice(0, pWork.outputPos));
          totalOutput += pWork.outputPos;
          writeBuf(outputBuffer.slice(0, pWork.outputPos), pWork.outputPos);
          pWork.outputPos = 0;
        }
      } else {
        // Repetition
        const repLength = oneLiteral - 0x100 + 2;
        const distance = decodeDist(pWork, repLength);
        
        if (distance === 0) {
          return {
            success: false,
            errorCode: PklibErrorCode.CMP_BAD_DATA
          };
        }

        // Copy bytes from sliding window
        for (let i = 0; i < repLength; i++) {
          const byte = pWork.slidingWindow.getByte(distance - 1);
          outputBuffer[pWork.outputPos] = byte;
          pWork.slidingWindow.writeByte(byte);
          pWork.outputPos++;
          
          if (pWork.outputPos >= outputBuffer.length) {
            outputChunks.push(outputBuffer.slice(0, pWork.outputPos));
            totalOutput += pWork.outputPos;
            writeBuf(outputBuffer.slice(0, pWork.outputPos), pWork.outputPos);
            pWork.outputPos = 0;
          }
        }
      }
    }

    // Write remaining output
    if (pWork.outputPos > 0) {
      outputChunks.push(outputBuffer.slice(0, pWork.outputPos));
      totalOutput += pWork.outputPos;
      writeBuf(outputBuffer.slice(0, pWork.outputPos), pWork.outputPos);
    }

    // Combine all output chunks
    const result = new Uint8Array(totalOutput);
    let offset = 0;
    for (const chunk of outputChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      success: true,
      errorCode: PklibErrorCode.CMP_NO_ERROR,
      decompressedData: result,
      originalSize: totalOutput
    };

  } catch (error) {
    return {
      success: false,
      errorCode: PklibErrorCode.CMP_BAD_DATA
    };
  }
}

/**
 * Utility function to get explode size constants
 */
export function getExplodeSizeConstants(): {
  own_size: number;
  internal_struct_size: number;
  IN_BUFF_SIZE: number;
  CODES_SIZE: number;
  OFFSS_SIZE: number;
  OFFSS_SIZE1: number;
  CH_BITS_ASC_SIZE: number;
  LENS_SIZES: number;
} {
  return {
    own_size: 32,
    internal_struct_size: 12596,
    IN_BUFF_SIZE: ExplodeSizesEnum.IN_BUFF_SIZE,
    CODES_SIZE: ExplodeSizesEnum.CODES_SIZE,
    OFFSS_SIZE: ExplodeSizesEnum.OFFSS_SIZE,
    OFFSS_SIZE1: ExplodeSizesEnum.OFFSS_SIZE1,
    CH_BITS_ASC_SIZE: LUTSizesEnum.CH_BITS_ASC_SIZE,
    LENS_SIZES: LUTSizesEnum.LENS_SIZES,
  };
}
