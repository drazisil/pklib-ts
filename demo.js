#!/usr/bin/env node

/**
 * Demo script for pklib-ts
 * Shows basic usage of the compression library
 */

const { 
  implode, 
  explode,
  CMP_BINARY,
  CMP_ASCII,
  ImplodeDictSizes,
  crc32_pklib,
} = require('./dist/index.js');

function createStreamFunctions(inputData) {
  let inputPos = 0;
  const outputChunks = [];

  const readFunc = (buffer, size) => {
    const remainingBytes = inputData.length - inputPos;
    const bytesToRead = Math.min(size, remainingBytes);
    
    if (bytesToRead > 0) {
      buffer.set(inputData.subarray(inputPos, inputPos + bytesToRead));
      inputPos += bytesToRead;
    }
    
    return bytesToRead;
  };

  const writeFunc = (buffer, size) => {
    outputChunks.push(buffer.slice(0, size));
  };

  const getOutput = () => {
    const totalSize = outputChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of outputChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  const reset = () => {
    inputPos = 0;
    outputChunks.length = 0;
  };

  return { readFunc, writeFunc, getOutput, reset };
}

function demonstrateCompression() {
  console.log('=== PKLib-TS Demonstration ===\n');

  // Test data
  const testString = "Hello, World! This is a test of the PKWARE compression algorithm. ".repeat(10);
  const originalData = new Uint8Array(testString.split('').map(c => c.charCodeAt(0)));
  
  console.log(`Original data: "${testString.substring(0, 50)}..."`);
  console.log(`Original size: ${originalData.length} bytes`);
  console.log(`Original CRC32: 0x${(crc32_pklib(originalData) >>> 0).toString(16).toUpperCase()}\n`);

  // Test compression
  const streams = createStreamFunctions(originalData);
  
  const compressResult = implode(
    streams.readFunc,
    streams.writeFunc,
    CMP_BINARY,
    ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2
  );

  if (compressResult.success) {
    const compressedData = streams.getOutput();
    
    console.log('✅ Compression successful!');
    console.log(`Compressed size: ${compressedData.length} bytes`);
    console.log(`Compression ratio: ${(compressedData.length / originalData.length * 100).toFixed(1)}%`);
    console.log(`Space saved: ${originalData.length - compressedData.length} bytes\n`);
    
    // Show first few bytes of compressed data
    const preview = Array.from(compressedData.slice(0, 16))
      .map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`)
      .join(' ');
    console.log(`Compressed data preview: ${preview}...\n`);
  } else {
    console.log('❌ Compression failed!');
    console.log(`Error code: ${compressResult.errorCode}\n`);
  }

  // Test different dictionary sizes
  console.log('=== Testing Different Dictionary Sizes ===');
  
  const dictSizes = [
    { size: ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1, name: '1KB' },
    { size: ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2, name: '2KB' },
    { size: ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3, name: '4KB' }
  ];

  for (const dict of dictSizes) {
    streams.reset();
    const result = implode(
      streams.readFunc,
      streams.writeFunc,
      CMP_BINARY,
      dict.size
    );

    if (result.success) {
      const compressed = streams.getOutput();
      console.log(`${dict.name} dictionary: ${compressed.length} bytes (${(compressed.length / originalData.length * 100).toFixed(1)}%)`);
    } else {
      console.log(`${dict.name} dictionary: Failed (error ${result.errorCode})`);
    }
  }

  console.log('\n=== Testing ASCII vs Binary Mode ===');
  
  // ASCII mode test
  streams.reset();
  const asciiResult = implode(
    streams.readFunc,
    streams.writeFunc,
    CMP_ASCII,
    ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2
  );

  if (asciiResult.success) {
    const asciiCompressed = streams.getOutput();
    console.log(`ASCII mode: ${asciiCompressed.length} bytes (${(asciiCompressed.length / originalData.length * 100).toFixed(1)}%)`);
  } else {
    console.log(`ASCII mode: Failed (error ${asciiResult.errorCode})`);
  }

  // Binary mode test
  streams.reset();
  const binaryResult = implode(
    streams.readFunc,
    streams.writeFunc,
    CMP_BINARY,
    ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2
  );

  if (binaryResult.success) {
    const binaryCompressed = streams.getOutput();
    console.log(`Binary mode: ${binaryCompressed.length} bytes (${(binaryCompressed.length / originalData.length * 100).toFixed(1)}%)`);
  } else {
    console.log(`Binary mode: Failed (error ${binaryResult.errorCode})`);
  }

  console.log('\n=== PKLib-TS Demo Complete ===');
}

// Run the demonstration
demonstrateCompression();
