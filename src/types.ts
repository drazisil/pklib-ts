/**
 * TypeScript port of PKWARE Data Compression Library
 * Based on pklib by Ladislav Zezula
 */

// Compression types
export const CMP_BINARY = 0;
export const CMP_ASCII = 1;

// Error codes
export enum PklibErrorCode {
  CMP_NO_ERROR = 0,
  CMP_INVALID_DICTSIZE = 1,
  CMP_INVALID_MODE = 2,
  CMP_BAD_DATA = 3,
  CMP_ABORT = 4,
}

// Common sizes
export enum CommonSizes {
  OUT_BUFF_SIZE = 0x802,
  BUFF_SIZE = 0x2204,
}

// Dictionary sizes for implode
export enum ImplodeDictSizes {
  CMP_IMPLODE_DICT_SIZE1 = 1024,
  CMP_IMPLODE_DICT_SIZE2 = 2048,
  CMP_IMPLODE_DICT_SIZE3 = 4096,
}

// Size constants for implode
export enum ImplodeSizesEnum {
  OFFSS_SIZE2 = 0x204,
  LITERALS_COUNT = 0x306,
  HASHTABLE_SIZE = 0x900,
}

// Size constants for explode
export enum ExplodeSizesEnum {
  IN_BUFF_SIZE = 0x800,
  CODES_SIZE = 0x100,
  OFFSS_SIZE = 0x100,
  OFFSS_SIZE1 = 0x80,
}

// Table sizes
export enum LUTSizesEnum {
  DIST_SIZES = 0x40,
  CH_BITS_ASC_SIZE = 0x100,
  LENS_SIZES = 0x10,
}

// Internal constants for decompression
export const PKDCL_OK = 0;
export const PKDCL_STREAM_END = 1;
export const PKDCL_NEED_DICT = 2;
export const PKDCL_CONTINUE = 10;
export const PKDCL_GET_INPUT = 11;

// Dictionary offsets for implode
export const DICT_OFFSET = 0x1000;
export const UNCMP_OFFSET = 0x2000;

// Function types for stream operations
export type ReadFunction = (buffer: Uint8Array, size: number) => number;
export type WriteFunction = (buffer: Uint8Array, size: number) => void;

// Interfaces for size constants
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

// Compression result interface
export interface CompressionResult {
  success: boolean;
  errorCode: PklibErrorCode;
  compressedSize?: number;
  originalSize?: number;
}

// Decompression result interface
export interface DecompressionResult {
  success: boolean;
  errorCode: PklibErrorCode;
  decompressedData?: Uint8Array;
  originalSize?: number;
}
