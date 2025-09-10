/**
 * Main entry point for pklib-ts
 * TypeScript port of PKWARE Data Compression Library
 */
export * from './types';
export { getLUTSizeConstants } from './PKWareLUT/PKWareLUTs';
export { explode, getExplodeSizeConstants } from './explode/explode';
export { implode, getImplodeSizeConstants } from './implode/implode';
export { BitStream } from './common/BitStream';
export { SlidingWindow } from './common/SlidingWindow';
export * from './PKWareLUT/PKWareLUTs';
/**
 * CRC32 calculation compatible with pklib
 * The original function was renamed from "crc32" to "crc32pk" for zlib compatibility
 */
export declare function crc32_pklib(buffer: Uint8Array, oldCrc?: number): number;
/**
 * Utility function to get common size constants
 */
export declare function getCommonSizeConstants(): {
    own_size: number;
    OUT_BUFF_SIZE: number;
    BUFF_SIZE: number;
};
//# sourceMappingURL=index.d.ts.map