# pklib-ts

A TypeScript port of the PKWARE Data Compression Library, originally created by Ladislav Zezula.

## License

**This code is licensed under GPL 3.0 or later.**

This TypeScript port of PKLib is released under the **GNU General Public License v3.0 or later** to ensure that all derivatives and improvements remain open source and benefit the community.

## Source References

This is a TypeScript port of [Ladislav Zezula](https://github.com/ladislav-zezula)'s [`pklib`](https://github.com/ladislav-zezula/StormLib/tree/master/src/pklib), extracted from [`StormLib`](https://github.com/ladislav-zezula/StormLib).

**Original Source**: PKWare Data Compression Library (DCL) implementation  
**Original Author**: Ladislav Zezula  
**Original License**: MIT (for reference)  
**This TypeScript Port**: GPL 3.0+ (see LICENSE file)  
**Test Fixtures**: MIT License by Travis Collins (ShieldBattery/implode-decoder)

## Overview

This library provides compression and decompression functionality compatible with the PKWARE compression algorithm used in various applications and file formats. It includes both implode (compression) and explode (decompression) functions with support for different dictionary sizes and compression modes.

## Features

- **Implode**: Compression using dictionary-based algorithm
- **Explode**: Decompression compatible with PKWARE compressed data
- **Multiple Dictionary Sizes**: Support for 1024, 2048, and 4096 byte dictionaries
- **Compression Modes**: Binary and ASCII compression modes
- **CRC32**: Compatible CRC32 calculation function
- **TypeScript**: Full TypeScript support with type definitions
- **Stream-based**: Efficient stream-based processing for large data

## Installation

```bash
npm install pklib-ts
```

## Quick Start

```typescript
import { implode, explode, CMP_BINARY, ImplodeDictSizes } from 'pklib-ts';

// Example data to compress
const originalData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

// Create stream functions
let inputPos = 0;
const outputChunks: Uint8Array[] = [];

const readFunc = (buffer: Uint8Array, size: number): number => {
  const remainingBytes = originalData.length - inputPos;
  const bytesToRead = Math.min(size, remainingBytes);
  
  if (bytesToRead > 0) {
    buffer.set(originalData.subarray(inputPos, inputPos + bytesToRead));
    inputPos += bytesToRead;
  }
  
  return bytesToRead;
};

const writeFunc = (buffer: Uint8Array, size: number): void => {
  outputChunks.push(buffer.slice(0, size));
};

// Compress the data
const compressResult = implode(
  readFunc,
  writeFunc,
  CMP_BINARY,
  ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1
);

if (compressResult.success) {
  console.log('Compression successful!');
  console.log('Original size:', compressResult.originalSize);
  console.log('Compressed size:', compressResult.compressedSize);
}
```

## API Reference

### Compression (Implode)

```typescript
function implode(
  readBuf: ReadFunction,
  writeBuf: WriteFunction,
  compressionType: number,
  dictionarySize: number
): CompressionResult
```

**Parameters:**
- `readBuf`: Function to read input data
- `writeBuf`: Function to write compressed output
- `compressionType`: `CMP_BINARY` (0) or `CMP_ASCII` (1)
- `dictionarySize`: Dictionary size (1024, 2048, or 4096)

### Decompression (Explode)

```typescript
function explode(
  readBuf: ReadFunction,
  writeBuf: WriteFunction,
  compressionType: number,
  dictionarySize: number
): DecompressionResult
```

**Parameters:**
- `readBuf`: Function to read compressed input
- `writeBuf`: Function to write decompressed output
- `compressionType`: `CMP_BINARY` (0) or `CMP_ASCII` (1)
- `dictionarySize`: Dictionary size (1024, 2048, or 4096)

### Stream Functions

```typescript
type ReadFunction = (buffer: Uint8Array, size: number) => number;
type WriteFunction = (buffer: Uint8Array, size: number) => void;
```

### Constants

```typescript
// Compression types
const CMP_BINARY = 0;
const CMP_ASCII = 1;

// Dictionary sizes
enum ImplodeDictSizes {
  CMP_IMPLODE_DICT_SIZE1 = 1024,
  CMP_IMPLODE_DICT_SIZE2 = 2048,
  CMP_IMPLODE_DICT_SIZE3 = 4096,
}

// Error codes
enum PklibErrorCode {
  CMP_NO_ERROR = 0,
  CMP_INVALID_DICTSIZE = 1,
  CMP_INVALID_MODE = 2,
  CMP_BAD_DATA = 3,
  CMP_ABORT = 4,
}
```

### Utility Functions

```typescript
// CRC32 calculation
function crc32_pklib(buffer: Uint8Array, oldCrc?: number): number;

// Size constants
function getCommonSizeConstants(): CommonSizeConstants;
function getImplodeSizeConstants(): ImplodeSizeConstants;
function getExplodeSizeConstants(): ExplodeSizeConstants;
```

## Examples

### Basic Compression and Decompression

```typescript
import { 
  implode, 
  explode, 
  CMP_BINARY, 
  ImplodeDictSizes,
  ReadFunction,
  WriteFunction
} from 'pklib-ts';

async function compressAndDecompress(data: Uint8Array) {
  // Compression
  let inputPos = 0;
  const compressedChunks: Uint8Array[] = [];

  const compressRead: ReadFunction = (buffer, size) => {
    const remaining = data.length - inputPos;
    const toRead = Math.min(size, remaining);
    if (toRead > 0) {
      buffer.set(data.subarray(inputPos, inputPos + toRead));
      inputPos += toRead;
    }
    return toRead;
  };

  const compressWrite: WriteFunction = (buffer, size) => {
    compressedChunks.push(buffer.slice(0, size));
  };

  const compressResult = implode(
    compressRead,
    compressWrite,
    CMP_BINARY,
    ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2
  );

  if (!compressResult.success) {
    throw new Error('Compression failed');
  }

  // Combine compressed chunks
  const compressed = new Uint8Array(
    compressedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  );
  let offset = 0;
  for (const chunk of compressedChunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Decompression
  let compressedPos = 0;
  const decompressedChunks: Uint8Array[] = [];

  const decompressRead: ReadFunction = (buffer, size) => {
    const remaining = compressed.length - compressedPos;
    const toRead = Math.min(size, remaining);
    if (toRead > 0) {
      buffer.set(compressed.subarray(compressedPos, compressedPos + toRead));
      compressedPos += toRead;
    }
    return toRead;
  };

  const decompressWrite: WriteFunction = (buffer, size) => {
    decompressedChunks.push(buffer.slice(0, size));
  };

  const decompressResult = explode(
    decompressRead,
    decompressWrite,
    CMP_BINARY,
    ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2
  );

  if (!decompressResult.success) {
    throw new Error('Decompression failed');
  }

  // Combine decompressed chunks
  const decompressed = new Uint8Array(
    decompressedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  );
  offset = 0;
  for (const chunk of decompressedChunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  return {
    original: data,
    compressed,
    decompressed,
    compressionRatio: compressed.length / data.length
  };
}
```

### Data Integrity Verification

```typescript
import { crc32_pklib } from 'pklib-ts';

function verifyIntegrity(original: Uint8Array, decompressed: Uint8Array): boolean {
  const originalCrc = crc32_pklib(original);
  const decompressedCrc = crc32_pklib(decompressed);
  return originalCrc === decompressedCrc;
}
```

## Building from Source

```bash
git clone <repository>
cd pklib-ts
npm install
npm run build
npm test
```

## Compatibility

This TypeScript port maintains compatibility with the original pklib C library:

- Same compression algorithm and format
- Compatible dictionary sizes and modes
- Identical CRC32 implementation
- Same error codes and behavior

## License

This project maintains the same license as the original pklib library.

## Credits

Based on the original PKWARE Data Compression Library by Ladislav Zezula.
TypeScript port created with focus on maintaining compatibility and performance.

## Contributing

Contributions are welcome! Please ensure that:

1. All tests pass
2. Code follows TypeScript best practices
3. Compatibility with original pklib is maintained
4. New features include appropriate tests
