import { explode } from '../src/explode/explode';
import fs from 'fs';
import path from 'path';

describe('Header Analysis', () => {
  it('should analyze header patterns in test files', () => {
    const testFiles = [
      'small.imploded',
      'medium.imploded', 
      'large.imploded'
    ];
    
    for (const filename of testFiles) {
      const filepath = path.join(__dirname, '../test-fixtures', filename);
      const data = fs.readFileSync(filepath);
      
      console.log(`\n=== ${filename} ===`);
      console.log(`File size: ${data.length} bytes`);
      console.log(`Header: ${Array.from(data.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      
      const compressionType = data[0];
      const dictSizeBits = data[1]; 
      const initialBitBuffer = data[2];
      const firstDataByte = data[3];
      
      console.log(`Compression type: ${compressionType} (${compressionType === 0 ? 'CMP_BINARY' : 'CMP_ASCII'})`);
      console.log(`Dict size bits: ${dictSizeBits} (dict size: ${1024 << (dictSizeBits - 4)})`);
      console.log(`Initial bit buffer: 0x${initialBitBuffer.toString(16)}`);
      console.log(`First data byte: 0x${firstDataByte.toString(16)}`);
      console.log(`Binary: init=${initialBitBuffer.toString(2).padStart(8, '0')}, first=${firstDataByte.toString(2).padStart(8, '0')}`);
    }
  });
});
