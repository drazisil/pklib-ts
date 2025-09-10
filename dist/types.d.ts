/**
 * TypeScript port of PKWARE Data Compression Library
 * Based on pklib by Ladislav Zezula
 */
export declare const CMP_BINARY = 0;
export declare const CMP_ASCII = 1;
export declare enum PklibErrorCode {
    CMP_NO_ERROR = 0,
    CMP_INVALID_DICTSIZE = 1,
    CMP_INVALID_MODE = 2,
    CMP_BAD_DATA = 3,
    CMP_ABORT = 4
}
export declare enum CommonSizes {
    OUT_BUFF_SIZE = 2050,
    BUFF_SIZE = 8708
}
export declare enum ImplodeDictSizes {
    CMP_IMPLODE_DICT_SIZE1 = 1024,
    CMP_IMPLODE_DICT_SIZE2 = 2048,
    CMP_IMPLODE_DICT_SIZE3 = 4096
}
export declare enum ImplodeSizesEnum {
    OFFSS_SIZE2 = 516,
    LITERALS_COUNT = 774,
    HASHTABLE_SIZE = 2304
}
export declare enum ExplodeSizesEnum {
    IN_BUFF_SIZE = 2048,
    CODES_SIZE = 256,
    OFFSS_SIZE = 256,
    OFFSS_SIZE1 = 128
}
export declare enum LUTSizesEnum {
    DIST_SIZES = 64,
    CH_BITS_ASC_SIZE = 256,
    LENS_SIZES = 16
}
export declare const PKDCL_OK = 0;
export declare const PKDCL_STREAM_END = 1;
export declare const PKDCL_NEED_DICT = 2;
export declare const PKDCL_CONTINUE = 10;
export declare const PKDCL_GET_INPUT = 11;
export declare const DICT_OFFSET = 4096;
export declare const UNCMP_OFFSET = 8192;
export type ReadFunction = (buffer: Uint8Array, size: number) => number;
export type WriteFunction = (buffer: Uint8Array, size: number) => void;
export interface CommonSizeConstants {
    own_size: number;
    OUT_BUFF_SIZE: number;
    BUFF_SIZE: number;
}
export interface ImplodeSizeConstants {
    own_size: number;
    internal_struct_size: number;
    OFFSS_SIZE2: number;
    LITERALS_COUNT: number;
    HASHTABLE_SIZE: number;
}
export interface ExplodeSizeConstants {
    own_size: number;
    internal_struct_size: number;
    IN_BUFF_SIZE: number;
    CODES_SIZE: number;
    OFFSS_SIZE: number;
    OFFSS_SIZE1: number;
    CH_BITS_ASC_SIZE: number;
    LENS_SIZES: number;
}
export interface LUTSizeConstants {
    own_size: number;
    DIST_SIZES: number;
    CH_BITS_ASC_SIZE: number;
    LENS_SIZES: number;
}
export interface CompressionResult {
    success: boolean;
    errorCode: PklibErrorCode;
    compressedSize?: number;
    originalSize?: number;
}
export interface DecompressionResult {
    success: boolean;
    errorCode: PklibErrorCode;
    decompressedData?: Uint8Array;
    originalSize?: number;
}
//# sourceMappingURL=types.d.ts.map