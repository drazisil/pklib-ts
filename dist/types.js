"use strict";
/**
 * TypeScript port of PKWARE Data Compression Library
 * Based on pklib by Ladislav Zezula
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNCMP_OFFSET = exports.DICT_OFFSET = exports.PKDCL_GET_INPUT = exports.PKDCL_CONTINUE = exports.PKDCL_NEED_DICT = exports.PKDCL_STREAM_END = exports.PKDCL_OK = exports.LUTSizesEnum = exports.ExplodeSizesEnum = exports.ImplodeSizesEnum = exports.ImplodeDictSizes = exports.CommonSizes = exports.PklibErrorCode = exports.CMP_ASCII = exports.CMP_BINARY = void 0;
// Compression types
exports.CMP_BINARY = 0;
exports.CMP_ASCII = 1;
// Error codes
var PklibErrorCode;
(function (PklibErrorCode) {
    PklibErrorCode[PklibErrorCode["CMP_NO_ERROR"] = 0] = "CMP_NO_ERROR";
    PklibErrorCode[PklibErrorCode["CMP_INVALID_DICTSIZE"] = 1] = "CMP_INVALID_DICTSIZE";
    PklibErrorCode[PklibErrorCode["CMP_INVALID_MODE"] = 2] = "CMP_INVALID_MODE";
    PklibErrorCode[PklibErrorCode["CMP_BAD_DATA"] = 3] = "CMP_BAD_DATA";
    PklibErrorCode[PklibErrorCode["CMP_ABORT"] = 4] = "CMP_ABORT";
})(PklibErrorCode || (exports.PklibErrorCode = PklibErrorCode = {}));
// Common sizes
var CommonSizes;
(function (CommonSizes) {
    CommonSizes[CommonSizes["OUT_BUFF_SIZE"] = 2050] = "OUT_BUFF_SIZE";
    CommonSizes[CommonSizes["BUFF_SIZE"] = 8708] = "BUFF_SIZE";
})(CommonSizes || (exports.CommonSizes = CommonSizes = {}));
// Dictionary sizes for implode
var ImplodeDictSizes;
(function (ImplodeDictSizes) {
    ImplodeDictSizes[ImplodeDictSizes["CMP_IMPLODE_DICT_SIZE1"] = 1024] = "CMP_IMPLODE_DICT_SIZE1";
    ImplodeDictSizes[ImplodeDictSizes["CMP_IMPLODE_DICT_SIZE2"] = 2048] = "CMP_IMPLODE_DICT_SIZE2";
    ImplodeDictSizes[ImplodeDictSizes["CMP_IMPLODE_DICT_SIZE3"] = 4096] = "CMP_IMPLODE_DICT_SIZE3";
})(ImplodeDictSizes || (exports.ImplodeDictSizes = ImplodeDictSizes = {}));
// Size constants for implode
var ImplodeSizesEnum;
(function (ImplodeSizesEnum) {
    ImplodeSizesEnum[ImplodeSizesEnum["OFFSS_SIZE2"] = 516] = "OFFSS_SIZE2";
    ImplodeSizesEnum[ImplodeSizesEnum["LITERALS_COUNT"] = 774] = "LITERALS_COUNT";
    ImplodeSizesEnum[ImplodeSizesEnum["HASHTABLE_SIZE"] = 2304] = "HASHTABLE_SIZE";
})(ImplodeSizesEnum || (exports.ImplodeSizesEnum = ImplodeSizesEnum = {}));
// Size constants for explode
var ExplodeSizesEnum;
(function (ExplodeSizesEnum) {
    ExplodeSizesEnum[ExplodeSizesEnum["IN_BUFF_SIZE"] = 2048] = "IN_BUFF_SIZE";
    ExplodeSizesEnum[ExplodeSizesEnum["CODES_SIZE"] = 256] = "CODES_SIZE";
    ExplodeSizesEnum[ExplodeSizesEnum["OFFSS_SIZE"] = 256] = "OFFSS_SIZE";
    ExplodeSizesEnum[ExplodeSizesEnum["OFFSS_SIZE1"] = 128] = "OFFSS_SIZE1";
})(ExplodeSizesEnum || (exports.ExplodeSizesEnum = ExplodeSizesEnum = {}));
// Table sizes
var LUTSizesEnum;
(function (LUTSizesEnum) {
    LUTSizesEnum[LUTSizesEnum["DIST_SIZES"] = 64] = "DIST_SIZES";
    LUTSizesEnum[LUTSizesEnum["CH_BITS_ASC_SIZE"] = 256] = "CH_BITS_ASC_SIZE";
    LUTSizesEnum[LUTSizesEnum["LENS_SIZES"] = 16] = "LENS_SIZES";
})(LUTSizesEnum || (exports.LUTSizesEnum = LUTSizesEnum = {}));
// Internal constants for decompression
exports.PKDCL_OK = 0;
exports.PKDCL_STREAM_END = 1;
exports.PKDCL_NEED_DICT = 2;
exports.PKDCL_CONTINUE = 10;
exports.PKDCL_GET_INPUT = 11;
// Dictionary offsets for implode
exports.DICT_OFFSET = 0x1000;
exports.UNCMP_OFFSET = 0x2000;
//# sourceMappingURL=types.js.map