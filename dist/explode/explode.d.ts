/**
 * Explode (decompression) implementation - TypeScript port
 * Based on explode.c from pklib by Ladislav Zezula
 */
import { ReadFunction, WriteFunction, DecompressionResult } from '../types';
/**
 * Main explode (decompression) function
 * Compatible with PKWARE Data Compression Library API
 */
export declare function explode(readBuf: ReadFunction, writeBuf: WriteFunction): DecompressionResult;
/**
 * Utility function to get explode size constants
 */
export declare function getExplodeSizeConstants(): {
    own_size: number;
    internal_struct_size: number;
    IN_BUFF_SIZE: number;
    CODES_SIZE: number;
    OFFSS_SIZE: number;
    OFFSS_SIZE1: number;
    CH_BITS_ASC_SIZE: number;
    LENS_SIZES: number;
};
//# sourceMappingURL=explode.d.ts.map