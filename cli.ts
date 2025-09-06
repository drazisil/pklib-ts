#!/usr/bin/env node

/**
 * PKLib-TS CLI Tool
 * Simple command-line interface for explode/implode operations with hex data
 */

import { explode } from './src/explode/explode';
import { implode } from './src/implode/implode';
import { CMP_BINARY, CMP_ASCII, ImplodeDictSizes } from './src/types';

function showUsage() {
  console.log(`
PKLib-TS CLI Tool
================

Usage:
  node cli.ts explode <hex-data>
  node cli.ts implode <hex-data> [options]

Commands:
  explode     Decompress PKWARE-compressed hex data
  implode     Compress hex data using PKWARE algorithm

Options:
  --raw       Output raw binary data (no hex formatting)

Options for implode:
  --ascii     Use ASCII compression mode (default: binary)
  --dict=N    Dictionary size: 1024, 2048, or 4096 (default: 4096)

Examples:
  # Decompress hex data (formatted output)
  node cli.ts explode "0006ac149102420000000076004..."

  # Decompress hex data (raw binary output)
  node cli.ts explode "0006ac149102420000000076004..." --raw

  # Compress hex data (binary mode, 4096 dict)
  node cli.ts implode "56455220020000003b00495645..."

  # Compress hex data (ASCII mode, 2048 dict)
  node cli.ts implode "48656c6c6f20576f726c64" --ascii --dict=2048

Input Format:
  - Hex data can be provided with or without spaces
  - Case insensitive (both "FF" and "ff" work)
  - Examples: "deadbeef", "DE AD BE EF", "0xDEADBEEF"
`);
}

function parseHexString(hexStr: string): Uint8Array {
  // Remove spaces, 0x prefixes, and convert to uppercase
  const cleaned = hexStr
    .replace(/\s+/g, '')
    .replace(/0x/gi, '')
    .toUpperCase();
  
  // Validate hex string
  if (!/^[0-9A-F]*$/.test(cleaned)) {
    throw new Error('Invalid hex string. Only hex digits (0-9, A-F) are allowed.');
  }
  
  // Ensure even length
  if (cleaned.length % 2 !== 0) {
    throw new Error('Hex string must have even length (pairs of hex digits).');
  }
  
  // Convert to bytes
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substr(i, 2), 16);
  }
  
  return bytes;
}

function formatHexOutput(data: Uint8Array, maxWidth: number = 32): string {
  const lines: string[] = [];
  
  for (let i = 0; i < data.length; i += maxWidth) {
    const chunk = data.slice(i, i + maxWidth);
    const hexBytes = Array.from(chunk)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    
    const offset = i.toString(16).padStart(8, '0').toUpperCase();
    lines.push(`${offset}: ${hexBytes}`);
  }
  
  return lines.join('\n');
}

function performExplode(hexData: string, rawOutput: boolean = false): void {
  try {
    if (!rawOutput) {
      console.log('🔓 PKLib Explode (Decompression)');
      console.log('=================================\n');
    }
    
    const inputData = parseHexString(hexData);
    if (!rawOutput) {
      console.log(`Input: ${inputData.length} bytes`);
      console.log(`${formatHexOutput(inputData)}\n`);
    }
    
    const outputBuffer = new Uint8Array(64 * 1024); // 64KB buffer
    let outputPos = 0;
    
    const writeCallback = (data: Uint8Array, bytesToWrite: number): number => {
      if (outputPos + bytesToWrite > outputBuffer.length) {
        throw new Error('Output buffer overflow');
      }
      outputBuffer.set(data.slice(0, bytesToWrite), outputPos);
      outputPos += bytesToWrite;
      return bytesToWrite;
    };
    
    let inputPos = 0;
    const readCallback = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, inputData.length - inputPos);
      if (available <= 0) return 0;
      
      buffer.set(inputData.slice(inputPos, inputPos + available));
      inputPos += available;
      return available;
    };
    
    const result = explode(readCallback, writeCallback);
    
    if (result.success) {
      const outputData = outputBuffer.slice(0, outputPos);
      
      if (rawOutput) {
        // Output raw binary data to stdout
        process.stdout.write(outputData);
      } else {
        console.log(`✅ Decompression successful!`);
        console.log(`Output: ${outputData.length} bytes`);
        console.log(`Compression ratio: ${((inputData.length / outputData.length) * 100).toFixed(1)}%\n`);
        console.log(`${formatHexOutput(outputData)}\n`);
        
        // Try to show as ASCII if printable
        const ascii = Array.from(outputData)
          .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
          .join('');
        console.log(`ASCII interpretation: "${ascii}"`);
      }
    } else {
      console.error(`❌ Decompression failed with error code: ${result.errorCode}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

function performImplode(hexData: string, options: { ascii?: boolean, dict?: number, raw?: boolean }): void {
  try {
    if (!options.raw) {
      console.log('🔒 PKLib Implode (Compression)');
      console.log('===============================\n');
    }
    
    const inputData = parseHexString(hexData);
    if (!options.raw) {
      console.log(`Input: ${inputData.length} bytes`);
      console.log(`${formatHexOutput(inputData)}\n`);
    }
    
    // Show ASCII interpretation if requested
    if (options.ascii && !options.raw) {
      const ascii = Array.from(inputData)
        .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
        .join('');
      console.log(`ASCII interpretation: "${ascii}"\n`);
    }
    
    const compressionMode = options.ascii ? CMP_ASCII : CMP_BINARY;
    const dictSize = options.dict || 4096;
    
    // Validate dictionary size
    const validDictSizes = [1024, 2048, 4096];
    if (!validDictSizes.includes(dictSize)) {
      throw new Error(`Invalid dictionary size: ${dictSize}. Valid sizes: ${validDictSizes.join(', ')}`);
    }
    
    if (!options.raw) {
      console.log(`Mode: ${options.ascii ? 'ASCII' : 'BINARY'}`);
      console.log(`Dictionary size: ${dictSize} bytes\n`);
    }
    
    const outputBuffer = new Uint8Array(64 * 1024); // 64KB buffer
    let outputPos = 0;
    
    const writeCallback = (data: Uint8Array, bytesToWrite: number): number => {
      if (outputPos + bytesToWrite > outputBuffer.length) {
        throw new Error('Output buffer overflow');
      }
      outputBuffer.set(data.slice(0, bytesToWrite), outputPos);
      outputPos += bytesToWrite;
      return bytesToWrite;
    };
    
    let inputPos = 0;
    const readCallback = (buffer: Uint8Array, bytesToRead: number): number => {
      const available = Math.min(bytesToRead, inputData.length - inputPos);
      if (available <= 0) return 0;
      
      buffer.set(inputData.slice(inputPos, inputPos + available));
      inputPos += available;
      return available;
    };
    
    const dictSizeEnum = dictSize === 1024 ? ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE1 :
                        dictSize === 2048 ? ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE2 :
                        ImplodeDictSizes.CMP_IMPLODE_DICT_SIZE3;
    
    const result = implode(readCallback, writeCallback, compressionMode, dictSizeEnum);
    
    if (result.success) {
      const outputData = outputBuffer.slice(0, outputPos);
      
      if (options.raw) {
        // Output raw binary data to stdout
        process.stdout.write(outputData);
      } else {
        console.log(`✅ Compression successful!`);
        console.log(`Output: ${outputData.length} bytes`);
        console.log(`Compression ratio: ${((outputData.length / inputData.length) * 100).toFixed(1)}%\n`);
        console.log(`${formatHexOutput(outputData)}`);
      }
    } else {
      console.error(`❌ Compression failed with error code: ${result.errorCode}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    process.exit(0);
  }
  
  const command = args[0];
  
  if (command === 'help' || command === '--help' || command === '-h') {
    showUsage();
    return;
  }
  
  const hexData = args[1];
  
  if (!hexData) {
    console.error('❌ Error: No hex data provided');
    showUsage();
    process.exit(1);
  }
  
  switch (command.toLowerCase()) {
    case 'explode':
    case 'decompress':
    case 'expand':
      // Check for --raw flag
      const rawExplode = args.includes('--raw');
      performExplode(hexData, rawExplode);
      break;
      
    case 'implode':
    case 'compress':
      // Parse options
      const options: { ascii?: boolean, dict?: number, raw?: boolean } = {};
      
      for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--ascii') {
          options.ascii = true;
        } else if (arg === '--raw') {
          options.raw = true;
        } else if (arg.startsWith('--dict=')) {
          options.dict = parseInt(arg.split('=')[1]);
        } else {
          console.error(`❌ Error: Unknown option: ${arg}`);
          showUsage();
          process.exit(1);
        }
      }
      
      performImplode(hexData, options);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
      
    default:
      console.error(`❌ Error: Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main();
}
