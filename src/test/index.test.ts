/**
 * Tests for main library functions and utilities
 */

import { 
  crc32_pklib, 
  getCommonSizeConstants,
  PklibErrorCode,
  CMP_BINARY,
  CMP_ASCII,
  CommonSizes,
  ImplodeDictSizes,
  ExplodeSizesEnum,
  ImplodeSizesEnum,
  LUTSizesEnum
} from '../index';

describe('Main Library Functions', () => {
  describe('getCommonSizeConstants', () => {
    it('should return correct common size constants', () => {
      const constants = getCommonSizeConstants();
      
      expect(constants.own_size).toBe(12);
      expect(constants.OUT_BUFF_SIZE).toBe(0x802);
      expect(constants.BUFF_SIZE).toBe(0x2204);
    });
  });

  describe('crc32_pklib', () => {
    it('should calculate CRC32 for empty buffer', () => {
      const buffer = new Uint8Array(0);
      const crc = crc32_pklib(buffer);
      
      expect(typeof crc).toBe('number');
      expect(crc).toBe(0); // CRC of empty buffer should be 0
    });

    it('should calculate CRC32 for simple data', () => {
      const buffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const crc = crc32_pklib(buffer);
      
      expect(typeof crc).toBe('number');
      expect(crc).not.toBe(0); // CRC should not be zero for non-empty data
    });

    it('should handle incremental CRC calculation', () => {
      const buffer1 = new Uint8Array([0x48, 0x65]); // "He"
      const buffer2 = new Uint8Array([0x6c, 0x6c, 0x6f]); // "llo"
      const fullBuffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      
      const crc1 = crc32_pklib(buffer1);
      const crc2 = crc32_pklib(buffer2, crc1);
      const fullCrc = crc32_pklib(fullBuffer);
      
      expect(crc2).toBe(fullCrc);
    });

    it('should produce consistent results', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      const crc1 = crc32_pklib(buffer);
      const crc2 = crc32_pklib(buffer);
      
      expect(crc1).toBe(crc2);
    });

    it('should handle different data sizes', () => {
      const small = new Uint8Array([42]);
      const medium = new Uint8Array(100).fill(42);
      const large = new Uint8Array(1000).fill(42);
      
      const crcSmall = crc32_pklib(small);
      const crcMedium = crc32_pklib(medium);
      const crcLarge = crc32_pklib(large);
      
      expect(typeof crcSmall).toBe('number');
      expect(typeof crcMedium).toBe('number');
      expect(typeof crcLarge).toBe('number');
      
      // Different sizes should produce different CRCs
      expect(crcSmall).not.toBe(crcMedium);
      expect(crcMedium).not.toBe(crcLarge);
    });
  });
});

describe('Constants and Enums', () => {
  describe('PklibErrorCode', () => {
    it('should have correct error code values', () => {
      expect(PklibErrorCode.CMP_NO_ERROR).toBe(0);
      expect(PklibErrorCode.CMP_INVALID_DICTSIZE).toBe(1);
      expect(PklibErrorCode.CMP_INVALID_MODE).toBe(2);
      expect(PklibErrorCode.CMP_BAD_DATA).toBe(3);
      expect(PklibErrorCode.CMP_ABORT).toBe(4);
    });
  });

  describe('Compression types', () => {
    it('should have correct compression type values', () => {
      expect(CMP_BINARY).toBe(0);
      expect(CMP_ASCII).toBe(1);
    });
  });

  describe('CommonSizes', () => {
    it('should have correct common size values', () => {
      expect(CommonSizes.OUT_BUFF_SIZE).toBe(0x802);
      expect(CommonSizes.BUFF_SIZE).toBe(0x2204);
    });
  });

  describe('ImplodeDictSizes', () => {
    it('should have correct dictionary size values', () => {
      expect(ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1).toBe(1024);
      expect(ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2).toBe(2048);
      expect(ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3).toBe(4096);
    });
  });

  describe('Size enums', () => {
    it('should have correct explode size values', () => {
      expect(ExplodeSizesEnum.IN_BUFF_SIZE).toBe(0x800);
      expect(ExplodeSizesEnum.CODES_SIZE).toBe(0x100);
      expect(ExplodeSizesEnum.OFFSS_SIZE).toBe(0x100);
      expect(ExplodeSizesEnum.OFFSS_SIZE1).toBe(0x80);
    });

    it('should have correct implode size values', () => {
      expect(ImplodeSizesEnum.OFFSS_SIZE2).toBe(0x204);
      expect(ImplodeSizesEnum.LITERALS_COUNT).toBe(0x306);
      expect(ImplodeSizesEnum.HASHTABLE_SIZE).toBe(0x900);
    });

    it('should have correct LUT size values', () => {
      expect(LUTSizesEnum.DIST_SIZES).toBe(0x40);
      expect(LUTSizesEnum.CH_BITS_ASC_SIZE).toBe(0x100);
      expect(LUTSizesEnum.LENS_SIZES).toBe(0x10);
    });
  });
});

describe('Type exports', () => {
  it('should export all required types', () => {
    // Test that types are available (they should compile without errors)
    const errorCode: PklibErrorCode = PklibErrorCode.CMP_NO_ERROR;
    const compressionType: number = CMP_BINARY;
    const dictSize: number = ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1;
    
    expect(errorCode).toBe(0);
    expect(compressionType).toBe(0);
    expect(dictSize).toBe(1024);
  });
});
