/**
 * External fixture tests using test data from ShieldBattery/implode-decoder
 * These tests validate our explode implementation against real-world compressed data
 */

import * as fs from 'fs';
import * as path from 'path';
import { explodePKLib } from '../explode/explode';
import { CMP_BINARY, CMP_ASCII } from '../types';

describe('External Fixture Tests', () => {
  const fixturesDir = path.join(__dirname, '../../test-fixtures');
  
  interface TestCase {
    name: string;
    implodedFile: string;
    decompFile: string;
    description: string;
  }

  const testCases: TestCase[] = [
    {
      name: 'small',
      implodedFile: 'small.imploded',
      decompFile: 'small.decomp',
      description: 'Small data compression test'
    },
    {
      name: 'medium',
      implodedFile: 'medium.imploded',
      decompFile: 'medium.decomp',
      description: 'Medium data compression test'
    },
    {
      name: 'large',
      implodedFile: 'large.imploded',
      decompFile: 'large.decomp',
      description: 'Large data compression test'
    },
    {
      name: 'large-ascii',
      implodedFile: 'large.imploded.ascii',
      decompFile: 'large.decomp',
      description: 'Large ASCII compression test'
    },
    {
      name: 'binary',
      implodedFile: 'binary.imploded',
      decompFile: 'binary.decomp',
      description: 'Binary data compression test'
    },
    {
      name: 'no-explicit-end',
      implodedFile: 'no-explicit-end.imploded',
      decompFile: 'no-explicit-end.decomp',
      description: 'Compression without explicit end marker'
    }
  ];

  // Helper function to detect compression type from the first byte
  function detectCompressionType(buffer: Uint8Array): number {
    if (buffer.length === 0) {
      throw new Error('Empty buffer');
    }
    const firstByte = buffer[0];
    if (firstByte === 0) {
      return CMP_BINARY;
    } else if (firstByte === 1) {
      return CMP_ASCII;
    } else {
      throw new Error(`Unknown compression type: ${firstByte}`);
    }
  }

  // Helper function to get dictionary size from the second byte
  function getDictionarySize(buffer: Uint8Array): number {
    if (buffer.length < 2) {
      throw new Error('Buffer too short to contain dictionary size');
    }
    const dictSizeBits = buffer[1];
    // Convert from bits to actual size
    switch (dictSizeBits) {
      case 4: return 1024;
      case 5: return 2048;
      case 6: return 4096;
      default: throw new Error(`Invalid dictionary size bits: ${dictSizeBits}`);
    }
  }

  testCases.forEach(testCase => {
    it(testCase.description, () => {
      const implodedPath = path.join(fixturesDir, testCase.implodedFile);
      const decompPath = path.join(fixturesDir, testCase.decompFile);

      // Check that both files exist
      expect(fs.existsSync(implodedPath)).toBe(true);
      expect(fs.existsSync(decompPath)).toBe(true);

      // Read the compressed data
      const compressedData = new Uint8Array(fs.readFileSync(implodedPath));
      expect(compressedData.length).toBeGreaterThan(2);

      // Read the expected decompressed data
      const expectedData = new Uint8Array(fs.readFileSync(decompPath));
      expect(expectedData.length).toBeGreaterThan(0);

      // Detect compression parameters from the header
      const compressionType = detectCompressionType(compressedData);
      const dictionarySize = getDictionarySize(compressedData);

      console.log(`Testing ${testCase.name}:`);
      console.log(`  Compressed size: ${compressedData.length} bytes`);
      console.log(`  Expected decompressed size: ${expectedData.length} bytes`);
      console.log(`  Compression type: ${compressionType === CMP_BINARY ? 'BINARY' : 'ASCII'}`);
      console.log(`  Dictionary size: ${dictionarySize}`);

      // Create read function that reads from the compressed data buffer
      let readPosition = 0; // Start from beginning so explodePKLib can read header
      const readBuf = (buffer: Uint8Array, size: number): number => {
        const bytesToRead = Math.min(size, compressedData.length - readPosition);
        if (bytesToRead <= 0) {
          return 0;
        }
        
        for (let i = 0; i < bytesToRead; i++) {
          buffer[i] = compressedData[readPosition + i];
        }
        readPosition += bytesToRead;
        return bytesToRead;
      };

      // Create write function that collects the decompressed data
      const outputData: number[] = [];
      const writeBuf = (buffer: Uint8Array, size: number): number => {
        for (let i = 0; i < size; i++) {
          outputData.push(buffer[i]);
        }
        return size;
      };

      // Decompress using our PKLib-compatible implementation
      const result = explodePKLib(readBuf, writeBuf);

      // Debug: Log the result details
      console.log(`  Result success: ${result.success}`);
      console.log(`  Result error code: ${result.errorCode}`);
      if (result.decompressedData) {
        console.log(`  Result data length: ${result.decompressedData.length}`);
      }
      console.log(`  Output data collected: ${outputData.length} bytes`);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.decompressedData).toBeDefined();
      
      const decompressed = result.decompressedData!;
      expect(decompressed.length).toBe(expectedData.length);
      expect(decompressed).toEqual(expectedData);

      console.log(`  ✓ Successfully decompressed and validated`);
    });
  });

  // Additional test to verify all fixture files exist
  it('should have all required test fixture files', () => {
    testCases.forEach(testCase => {
      const implodedPath = path.join(fixturesDir, testCase.implodedFile);
      const decompPath = path.join(fixturesDir, testCase.decompFile);
      
      expect(fs.existsSync(implodedPath)).toBe(true);
      expect(fs.existsSync(decompPath)).toBe(true);
    });
  });

  // Test to verify fixture directory structure
  it('should have test fixtures directory', () => {
    expect(fs.existsSync(fixturesDir)).toBe(true);
    expect(fs.statSync(fixturesDir).isDirectory()).toBe(true);
  });

  // Test to inspect file sizes and basic properties
  it('should have reasonable file sizes for fixtures', () => {
    testCases.forEach(testCase => {
      const implodedPath = path.join(fixturesDir, testCase.implodedFile);
      const decompPath = path.join(fixturesDir, testCase.decompFile);
      
      const implodedSize = fs.statSync(implodedPath).size;
      const decompSize = fs.statSync(decompPath).size;
      
      // Compressed files should have at least a 3-byte header
      expect(implodedSize).toBeGreaterThanOrEqual(3);
      
      // Decompressed files should be non-empty
      expect(decompSize).toBeGreaterThan(0);
      
      // For most cases, compressed should be smaller than decompressed
      // (though not always true for very small files)
      if (testCase.name.includes('large')) {
        expect(implodedSize).toBeLessThan(decompSize);
      }
      
      console.log(`${testCase.name}: ${implodedSize} bytes → ${decompSize} bytes`);
    });
  });
});
