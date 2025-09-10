"use strict";
/**
 * Implode (compression) implementation - TypeScript port
 * Based on implode.c from pklib by Ladislav Zezula
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.implode = implode;
exports.getImplodeSizeConstants = getImplodeSizeConstants;
const types_1 = require("../types");
const PKWareLUTs_1 = require("../PKWareLUT/PKWareLUTs");
const MAX_REP_LENGTH = 0x204; // Maximum repetition length
/**
 * Compression work structure
 */
class CompressionStruct {
    constructor(readFunc, writeFunc) {
        this.distance = 0; // Backward distance of found repetition
        this.outBytes = 0; // Bytes available in output buffer
        this.outBits = 0; // Bits available in last output byte
        this.dsizeBits = 0; // Number of bits for dictionary size
        this.dsizeMask = 0; // Bit mask for dictionary
        this.ctype = 0; // Compression type
        this.dsizeBytes = 0; // Dictionary size in bytes
        this.distBits = new Uint8Array(types_1.LUTSizesEnum.DIST_SIZES);
        this.distCodes = new Uint8Array(types_1.LUTSizesEnum.DIST_SIZES);
        this.nChBits = new Uint8Array(types_1.ImplodeSizesEnum.LITERALS_COUNT);
        this.nChCodes = new Uint16Array(types_1.ImplodeSizesEnum.LITERALS_COUNT);
        this.outBuff = new Uint8Array(0x802); // OUT_BUFF_SIZE
        this.workBuff = new Uint8Array(0x2204); // BUFF_SIZE
        this.phashToIndex = new Uint16Array(types_1.ImplodeSizesEnum.HASHTABLE_SIZE);
        this.phashOffs = new Uint16Array(0x2204); // BUFF_SIZE
        this.readFunc = readFunc;
        this.writeFunc = writeFunc;
        // Initialize tables
        this.distBits.set(PKWareLUTs_1.DistBits);
        this.distCodes.set(PKWareLUTs_1.DistCode);
    }
}
/**
 * Macro for calculating hash of byte pair
 */
function bytePairHash(buffer, offset) {
    return (buffer[offset] * 4) + (buffer[offset + 1] * 5);
}
/**
 * Sort buffer and build hash tables
 */
function sortBuffer(pWork, bufferBegin, bufferEnd) {
    let totalSum = 0;
    // Zero the hash-to-index table
    pWork.phashToIndex.fill(0);
    // Step 1: Count occurrences of each PAIR_HASH
    for (let bufferPtr = bufferBegin; bufferPtr < bufferEnd; bufferPtr++) {
        const hash = bytePairHash(pWork.workBuff, bufferPtr) % types_1.ImplodeSizesEnum.HASHTABLE_SIZE;
        pWork.phashToIndex[hash]++;
    }
    // Step 2: Convert to cumulative counts
    for (let i = 0; i < types_1.ImplodeSizesEnum.HASHTABLE_SIZE; i++) {
        totalSum += pWork.phashToIndex[i];
        pWork.phashToIndex[i] = totalSum;
    }
    // Step 3: Build offset table
    for (let bufferEnd2 = bufferEnd - 1; bufferEnd2 >= bufferBegin; bufferEnd2--) {
        const byteHash = bytePairHash(pWork.workBuff, bufferEnd2) % types_1.ImplodeSizesEnum.HASHTABLE_SIZE;
        const byteOffs = bufferEnd2;
        pWork.phashToIndex[byteHash]--;
        pWork.phashOffs[pWork.phashToIndex[byteHash]] = byteOffs;
    }
}
/**
 * Flush output buffer - matches C code exactly
 */
function flushBuf(pWork) {
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
function outputBits(pWork, nbits, bitBuff) {
    let outBits;
    // Ensure bitBuff is within safe integer range for bitwise operations
    bitBuff = bitBuff >>> 0; // Convert to unsigned 32-bit integer
    // If more than 8 bits to output, do recursion (exactly like C code)
    if (nbits > 8) {
        outputBits(pWork, 8, bitBuff);
        bitBuff >>= 8; // Use signed right shift like C code
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
        bitBuff >>= (8 - outBits); // Use signed right shift like C code
        pWork.outBuff[pWork.outBytes] = bitBuff & 0xFF;
        pWork.outBits &= 7;
    }
    else {
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
 * Find repetition in the dictionary (matches C code logic exactly)
 */
function findRep(pWork, bufferPos) {
    const maxLength = Math.min(MAX_REP_LENGTH, pWork.workBuff.length - bufferPos);
    let repLength = 1;
    let bestDistance = 0;
    if (maxLength < 2) {
        return { length: repLength, distance: bestDistance };
    }
    const hash = bytePairHash(pWork.workBuff, bufferPos) % types_1.ImplodeSizesEnum.HASHTABLE_SIZE;
    const hashEnd = (hash < types_1.ImplodeSizesEnum.HASHTABLE_SIZE - 1) ?
        pWork.phashToIndex[hash + 1] : pWork.phashOffs.length;
    const inputData = pWork.workBuff.slice(bufferPos);
    const minOffset = Math.max(0, bufferPos - pWork.dsizeBytes + 1);
    // Search through all positions with the same hash
    for (let hashOffs = pWork.phashToIndex[hash]; hashOffs < hashEnd; hashOffs++) {
        const repOffs = pWork.phashOffs[hashOffs];
        // Skip if offset is too old (beyond dictionary size)
        if (repOffs < minOffset) {
            continue;
        }
        // Don't look ahead
        if (repOffs >= bufferPos) {
            break;
        }
        const prevRepetition = pWork.workBuff.slice(repOffs);
        // Check if first byte and the last byte of current rep_length match (C code optimization)
        if (inputData[0] === prevRepetition[0] &&
            (repLength === 1 || inputData[repLength - 1] === prevRepetition[repLength - 1])) {
            // Count how many bytes match
            let equalByteCount = 0;
            while (equalByteCount < maxLength &&
                equalByteCount < prevRepetition.length &&
                inputData[equalByteCount] === prevRepetition[equalByteCount]) {
                equalByteCount++;
            }
            // If we found a repetition of at least the same length, take it.
            // This ensures we find the most recent one (smallest distance = fewer bits)
            if (equalByteCount >= repLength) {
                bestDistance = bufferPos - repOffs;
                repLength = equalByteCount;
                // Repetitions longer than 10 bytes get special handling (C code comment)
                if (repLength > 10) {
                    break;
                }
            }
        }
    }
    // A repetition must have at least 2 bytes, otherwise it's not worth it
    return {
        length: repLength >= 2 ? repLength : 0,
        distance: bestDistance
    };
}
/**
 * Encode repetition - matches C code exactly
 */
function writeDistance(pWork, distance, length) {
    // Adjust distance to match C code behavior (PKLib stores distance decremented by 1)
    const adjustedDistance = distance - 1;
    // Output length code (rep_length + 0xFE)
    const lengthIndex = length + 0xFE;
    outputBits(pWork, pWork.nChBits[lengthIndex], pWork.nChCodes[lengthIndex]);
    // Output distance
    if (length === 2) {
        // For length 2, use 2-bit encoding
        outputBits(pWork, pWork.distBits[adjustedDistance >>> 2], pWork.distCodes[adjustedDistance >>> 2]);
        outputBits(pWork, 2, adjustedDistance & 3);
    }
    else {
        // For length > 2, use dictionary size encoding
        outputBits(pWork, pWork.distBits[adjustedDistance >>> pWork.dsizeBits], pWork.distCodes[adjustedDistance >>> pWork.dsizeBits]);
        outputBits(pWork, pWork.dsizeBits, pWork.dsizeMask & adjustedDistance);
    }
}
/**
 * Encode literal byte - matches C code exactly
 */
function writeLiteral(pWork, byte) {
    // Output literal using character codes directly
    outputBits(pWork, pWork.nChBits[byte], pWork.nChCodes[byte]);
}
/**
 * Main implode (compression) function
 */
function implode(readBuf, writeBuf, compressionType, dictionarySize) {
    try {
        const pWork = new CompressionStruct(readBuf, writeBuf);
        // Set compression type
        pWork.ctype = compressionType;
        // Set dictionary size parameters
        switch (dictionarySize) {
            case types_1.ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1:
                pWork.dsizeBits = 4;
                pWork.dsizeMask = 0x0F;
                pWork.dsizeBytes = 1024;
                break;
            case types_1.ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2:
                pWork.dsizeBits = 5;
                pWork.dsizeMask = 0x1F;
                pWork.dsizeBytes = 2048;
                break;
            case types_1.ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3:
                pWork.dsizeBits = 6;
                pWork.dsizeMask = 0x3F;
                pWork.dsizeBytes = 4096;
                break;
            default:
                return {
                    success: false,
                    errorCode: types_1.PklibErrorCode.CMP_INVALID_DICTSIZE
                };
        }
        // Initialize character tables like C code
        if (compressionType === types_1.CMP_BINARY) {
            // Binary mode: 9 bits for literals
            for (let nCount = 0; nCount < 0x100; nCount++) {
                pWork.nChBits[nCount] = 9;
                pWork.nChCodes[nCount] = nCount * 2;
            }
        }
        else {
            // ASCII mode: Use PKLib standard character encoding tables (FIXED)
            for (let i = 0; i < 0x100; i++) {
                pWork.nChBits[i] = PKWareLUTs_1.ChBitsAsc[i] + 1; // Add 1 like C code
                pWork.nChCodes[i] = PKWareLUTs_1.ChCodeAsc[i] * 2; // Multiply by 2 like C code
            }
        }
        // Initialize length codes (matches C code exactly)
        let nCount = 0x100;
        for (let i = 0; i < 0x10; i++) {
            for (let nCount2 = 0; nCount2 < (1 << PKWareLUTs_1.ExLenBits[i]); nCount2++) {
                pWork.nChBits[nCount] = PKWareLUTs_1.ExLenBits[i] + PKWareLUTs_1.LenBits[i] + 1;
                pWork.nChCodes[nCount] = (nCount2 << (PKWareLUTs_1.LenBits[i] + 1)) | ((PKWareLUTs_1.LenCode[i] & 0xFFFF00FF) * 2) | 1;
                nCount++;
            }
        }
        // Copy distance tables
        pWork.distBits.set(PKWareLUTs_1.DistBits);
        pWork.distCodes.set(PKWareLUTs_1.DistCode);
        // Initialize output buffer like C code
        // Write header: compression type and dictionary size bits only
        pWork.outBuff[0] = compressionType;
        pWork.outBuff[1] = pWork.dsizeBits;
        pWork.outBytes = 2; // Start writing compressed data from byte 2
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
            for (let i = bufferPos; i < endPos;) {
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
                            }
                            else {
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
                    }
                    else {
                        // Output literal
                        writeLiteral(pWork, pWork.workBuff[i]);
                        i++;
                    }
                }
                else {
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
            errorCode: types_1.PklibErrorCode.CMP_NO_ERROR,
            compressedSize: pWork.outBytes,
            originalSize: totalInput
        };
    }
    catch (error) {
        return {
            success: false,
            errorCode: types_1.PklibErrorCode.CMP_BAD_DATA
        };
    }
}
/**
 * Utility function to get implode size constants
 */
function getImplodeSizeConstants() {
    return {
        own_size: 20,
        internal_struct_size: 36312,
        OFFSS_SIZE2: types_1.ImplodeSizesEnum.OFFSS_SIZE2,
        LITERALS_COUNT: types_1.ImplodeSizesEnum.LITERALS_COUNT,
        HASHTABLE_SIZE: types_1.ImplodeSizesEnum.HASHTABLE_SIZE,
    };
}
//# sourceMappingURL=implode.js.map