"use strict";
/**
 * PKLib-compatible explode function that handles header parsing internally
 * This matches the C API more closely by handling the initial bit buffer properly
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.explodePKLib = explodePKLib;
exports.explode = explodePKLib;
const types_1 = require("../types");
const BitStream_1 = require("../common/BitStream");
const SlidingWindow_1 = require("../common/SlidingWindow");
const PKWareLUTs_1 = require("../PKWareLUT/PKWareLUTs");
/**
 * Decompression work structure for PKLib-compatible API
 */
class PKLibDecompressionStruct {
    constructor(readFunc) {
        this.ctype = 0; // Compression type (CMP_BINARY or CMP_ASCII)
        this.outputPos = 0; // Position in output buffer
        this.dsizeBits = 0; // Dict size (4, 5, 6 for 0x400, 0x800, 0x1000)
        this.dsizeMask = 0; // Dict size bitmask
        // Decode tables
        this.distPosCodes = new Uint8Array(types_1.ExplodeSizesEnum.CODES_SIZE);
        this.lengthCodes = new Uint8Array(types_1.ExplodeSizesEnum.CODES_SIZE);
        this.offs2C34 = new Uint8Array(types_1.ExplodeSizesEnum.OFFSS_SIZE);
        this.offs2D34 = new Uint8Array(types_1.ExplodeSizesEnum.OFFSS_SIZE);
        this.offs2E34 = new Uint8Array(types_1.ExplodeSizesEnum.OFFSS_SIZE1);
        this.offs2EB4 = new Uint8Array(types_1.ExplodeSizesEnum.OFFSS_SIZE);
        this.chBitsAscWork = new Uint8Array(types_1.LUTSizesEnum.CH_BITS_ASC_SIZE);
        this.distBits = new Uint8Array(types_1.LUTSizesEnum.DIST_SIZES);
        this.lenBits = new Uint8Array(types_1.LUTSizesEnum.LENS_SIZES);
        this.exLenBits = new Uint8Array(types_1.LUTSizesEnum.LENS_SIZES);
        this.lenBase = new Uint16Array(types_1.LUTSizesEnum.LENS_SIZES);
        this.bitStream = new BitStream_1.BitStream(readFunc);
        this.slidingWindow = new SlidingWindow_1.SlidingWindow(0x2204); // BUFF_SIZE from types
        // Initialize tables with default values
        this.distBits.set(PKWareLUTs_1.DistBits);
        this.lenBits.set(PKWareLUTs_1.LenBits);
        this.exLenBits.set(PKWareLUTs_1.ExLenBits);
        this.lenBase.set(PKWareLUTs_1.LenBase);
        this.chBitsAscWork.set(PKWareLUTs_1.ChBitsAsc);
    }
}
/**
 * PKLib-compatible explode function that reads the header from the input stream
 * This matches the original C API where the header is part of the compressed data
 */
function explodePKLib(readBuf, writeBuf) {
    try {
        // First, read enough data to get the header
        const initialBuffer = new Uint8Array(512); // Read a reasonable chunk initially
        const initialBytesRead = readBuf(initialBuffer, initialBuffer.length);
        if (initialBytesRead < 3) {
            return {
                success: false,
                errorCode: types_1.PklibErrorCode.CMP_BAD_DATA
            };
        }
        // Parse header
        const compressionType = initialBuffer[0];
        const dictionarySizeBits = initialBuffer[1];
        const initialBitBuffer = initialBuffer[2];
        console.log(`Header: type=${compressionType}, dictBits=${dictionarySizeBits}, initBits=0x${initialBitBuffer.toString(16)}`);
        // Validate compression type
        if (compressionType !== types_1.CMP_BINARY && compressionType !== types_1.CMP_ASCII) {
            return {
                success: false,
                errorCode: types_1.PklibErrorCode.CMP_INVALID_MODE
            };
        }
        // Validate dictionary size
        if (dictionarySizeBits < 4 || dictionarySizeBits > 6) {
            return {
                success: false,
                errorCode: types_1.PklibErrorCode.CMP_INVALID_DICTSIZE
            };
        }
        // Create a read function that provides the remaining data
        let position = 3; // Skip the header
        const remainingInitialData = initialBuffer.slice(3, initialBytesRead);
        let initialDataUsed = false;
        const wrappedReadBuf = (buffer, size) => {
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
            }
            else {
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
            errorCode: types_1.PklibErrorCode.CMP_BAD_DATA
        };
    }
    catch (error) {
        console.error('PKLib explode error:', error);
        return {
            success: false,
            errorCode: types_1.PklibErrorCode.CMP_ABORT
        };
    }
}
//# sourceMappingURL=explode-pklib.js.map