"use strict";
/**
 * Explode (decompression) implementation - TypeScript port
 * Based on explode.c from pklib by Ladislav Zezula
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.explode = explode;
exports.getExplodeSizeConstants = getExplodeSizeConstants;
const types_1 = require("../types");
const BitStream_1 = require("../common/BitStream");
const SlidingWindow_1 = require("../common/SlidingWindow");
const PKWareLUTs_1 = require("../PKWareLUT/PKWareLUTs");
/**
 * Decompression work structure
 */
class DecompressionStruct {
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
 * Generate decode tables for position codes
 */
function genDecodeTabs(positions, startIndexes, lengthBits, elements) {
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
function genAscTabs(pWork) {
    for (let count = 0xFF; count >= 0; count--) {
        const pChCodeAsc = PKWareLUTs_1.ChCodeAsc[count];
        let bitsAsc = pWork.chBitsAscWork[count];
        if (bitsAsc <= 8) {
            const add = 1 << bitsAsc;
            let acc = pChCodeAsc;
            while (acc < 0x100) {
                pWork.offs2C34[acc] = count;
                acc += add;
            }
        }
        else if ((pChCodeAsc & 0xFF) !== 0) {
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
            }
            else {
                bitsAsc -= 6;
                pWork.chBitsAscWork[count] = bitsAsc;
                const add = 1 << bitsAsc;
                let acc = pChCodeAsc >> 6;
                while (acc < 0x80) {
                    pWork.offs2E34[acc] = count;
                    acc += add;
                }
            }
        }
        else {
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
function decodeLit(pWork) {
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
            return 0x306; // Error - we started reading but couldn't complete
        }
        // Check for extra bits
        const extraLengthBits = pWork.exLenBits[lengthCode];
        if (extraLengthBits !== 0) {
            const extraLength = pWork.bitStream.getBitBuffer() & ((1 << extraLengthBits) - 1);
            if (!pWork.bitStream.wasteBits(extraLengthBits)) {
                return 0x306; // Error
            }
            const result = pWork.lenBase[lengthCode] + extraLength + 0x100;
            // Disable early end-of-stream check - 0x10E is a valid length code, not end marker
            // if (result === 0x10E) {
            //   return 0x305; // End of stream
            // }
            return result;
        }
        const result = pWork.lenBase[lengthCode] + 0x100;
        // Disable early end-of-stream check - 0x10E is a valid length code, not end marker  
        // if (result === 0x10E) {
        //   return 0x305; // End of stream
        // }
        return result;
    }
    else {
        // Single literal - remove one bit from input data
        if (!pWork.bitStream.wasteBits(1)) {
            console.log(`decodeLit: ERROR - failed to waste first bit`);
            return 0x306; // Error
        }
        // ASCII mode handling
        if (pWork.ctype === types_1.CMP_ASCII) {
            // Decode using ASCII tables
            const bitBuffer = pWork.bitStream.getBitBuffer();
            if (pWork.offs2C34[bitBuffer & 0xFF] === 0xFF) {
                if ((bitBuffer & 0x3F) !== 0) {
                    if (!pWork.bitStream.wasteBits(4)) {
                        return 0x306; // Error
                    }
                    const count = pWork.offs2D34[pWork.bitStream.getBitBuffer() & 0xFF];
                    if (!pWork.bitStream.wasteBits(pWork.chBitsAscWork[count])) {
                        return 0x306; // Error
                    }
                    return count;
                }
                else {
                    if (!pWork.bitStream.wasteBits(6)) {
                        return 0x306; // Error
                    }
                    const count = pWork.offs2E34[pWork.bitStream.getBitBuffer() & 0x7F];
                    if (!pWork.bitStream.wasteBits(pWork.chBitsAscWork[count])) {
                        return 0x306; // Error
                    }
                    return count;
                }
            }
            else {
                const count = pWork.offs2C34[bitBuffer & 0xFF];
                if (!pWork.bitStream.wasteBits(pWork.chBitsAscWork[count])) {
                    return 0x306; // Error
                }
                return count;
            }
        }
        else {
            // Binary mode - just return next 8 bits
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
function decodeDist(pWork, length) {
    // Get distance position code
    const distPosCode = pWork.distPosCodes[pWork.bitStream.getBitBuffer() & 0xFF];
    const distPosBits = pWork.distBits[distPosCode];
    if (!pWork.bitStream.wasteBits(distPosBits)) {
        return 0; // Error
    }
    if (length === 2) {
        // 2-byte repetition uses 2 additional bits
        const distance = (distPosCode << 2) | (pWork.bitStream.getBitBuffer() & 0x03);
        if (!pWork.bitStream.wasteBits(2)) {
            return 0; // Error
        }
        return distance + 1;
    }
    else {
        // Longer repetition uses dsize_bits additional bits
        const distance = (distPosCode << pWork.dsizeBits) | (pWork.bitStream.getBitBuffer() & pWork.dsizeMask);
        if (!pWork.bitStream.wasteBits(pWork.dsizeBits)) {
            return 0; // Error
        }
        return distance + 1;
    }
}
/**
 * Main explode (decompression) function
 * Compatible with PKWARE Data Compression Library API
 */
function explode(readBuf, writeBuf) {
    try {
        // Read enough data to get the header
        const headerBuffer = new Uint8Array(3);
        const headerBytesRead = readBuf(headerBuffer, 3);
        if (headerBytesRead < 3) {
            return {
                success: false,
                errorCode: types_1.PklibErrorCode.CMP_BAD_DATA
            };
        }
        // Parse header
        const compressionType = headerBuffer[0];
        const dictionarySizeBits = headerBuffer[1];
        const initialBitBuffer = headerBuffer[2];
        // Validate compression type
        if (compressionType !== types_1.CMP_BINARY && compressionType !== types_1.CMP_ASCII) {
            return {
                success: false,
                errorCode: types_1.PklibErrorCode.CMP_INVALID_MODE
            };
        }
        // Validate and convert dictionary size
        let dictionarySize;
        switch (dictionarySizeBits) {
            case 4:
                dictionarySize = 1024;
                break;
            case 5:
                dictionarySize = 2048;
                break;
            case 6:
                dictionarySize = 4096;
                break;
            default:
                return {
                    success: false,
                    errorCode: types_1.PklibErrorCode.CMP_INVALID_DICTSIZE
                };
        }
        // Create decompression structure with the header-aware read function
        const pWork = new DecompressionStruct(readBuf);
        // Set compression parameters
        pWork.ctype = compressionType;
        pWork.dsizeBits = dictionarySizeBits;
        pWork.dsizeMask = 0xFFFF >> (0x10 - dictionarySizeBits);
        // CRITICAL: Initialize bit stream with the initial bit buffer
        pWork.bitStream.initializeBitBuffer(initialBitBuffer);
        // Generate decode tables
        genDecodeTabs(pWork.distPosCodes, PKWareLUTs_1.DistCode, PKWareLUTs_1.DistBits, types_1.LUTSizesEnum.DIST_SIZES);
        genDecodeTabs(pWork.lengthCodes, PKWareLUTs_1.LenCode, PKWareLUTs_1.LenBits, types_1.LUTSizesEnum.LENS_SIZES);
        if (compressionType === types_1.CMP_ASCII) {
            genAscTabs(pWork);
        }
        const outputBuffer = new Uint8Array(0x1000); // 4KB output buffer
        let totalOutput = 0;
        let outputChunks = [];
        // Main decompression loop
        let iterationCount = 0;
        while (true) {
            iterationCount++;
            const oneLiteral = decodeLit(pWork);
            if (oneLiteral === 0x306) {
                // Error - but let's finalize what we have so far
                console.error(`PKLib: decodeLit error after ${iterationCount} iterations, outputPos=${pWork.outputPos}`);
                break;
            }
            if (oneLiteral === 0x305) {
                // End of stream
                console.error(`PKLib: end of stream reached after ${iterationCount} iterations`);
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
            }
            else {
                // Copy string
                const copyLength = oneLiteral - 0x100 + 2;
                const moveBackward = decodeDist(pWork, copyLength);
                if (moveBackward === 0) {
                    console.error(`PKLib: decodeDist error after ${iterationCount} iterations, outputPos=${pWork.outputPos}`);
                    break;
                }
                for (let i = 0; i < copyLength; i++) {
                    const byte = pWork.slidingWindow.getByte(moveBackward);
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
            errorCode: types_1.PklibErrorCode.CMP_NO_ERROR,
            decompressedData: result,
            originalSize: totalOutput
        };
    }
    catch (error) {
        return {
            success: false,
            errorCode: types_1.PklibErrorCode.CMP_ABORT
        };
    }
}
/**
 * Utility function to get explode size constants
 */
function getExplodeSizeConstants() {
    return {
        own_size: 36,
        internal_struct_size: 2452, // Size of the decompression structure
        IN_BUFF_SIZE: types_1.ExplodeSizesEnum.IN_BUFF_SIZE,
        CODES_SIZE: types_1.ExplodeSizesEnum.CODES_SIZE,
        OFFSS_SIZE: types_1.ExplodeSizesEnum.OFFSS_SIZE,
        OFFSS_SIZE1: types_1.ExplodeSizesEnum.OFFSS_SIZE1,
        CH_BITS_ASC_SIZE: types_1.LUTSizesEnum.CH_BITS_ASC_SIZE,
        LENS_SIZES: types_1.LUTSizesEnum.LENS_SIZES,
    };
}
//# sourceMappingURL=explode.js.map