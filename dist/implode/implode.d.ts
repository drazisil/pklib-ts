/**
 * Implode (compression) implementation - TypeScript port
 * Based on implode.c from pklib by Ladislav Zezula
 */
import { ReadFunction, WriteFunction, CompressionResult } from '../types';
/**
 * Main implode (compression) function
 */
export declare function implode(readBuf: ReadFunction, writeBuf: WriteFunction, compressionType: number, dictionarySize: number): CompressionResult;
/**
 * Utility function to get implode size constants
 */
export declare function getImplodeSizeConstants(): {
    own_size: number;
    internal_struct_size: number;
    OFFSS_SIZE2: number;
    LITERALS_COUNT: number;
    HASHTABLE_SIZE: number;
};
//# sourceMappingURL=implode.d.ts.map