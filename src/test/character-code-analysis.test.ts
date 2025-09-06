import { ChBitsAsc, ChCodeAsc } from '../PKWareLUT/PKWareLUTs';

describe('Character Code Analysis', () => {
  test('Find 6-bit character codes', () => {
    console.log('🔍 CHARACTER CODES WITH 6 BITS:');
    console.log('================================');
    
    for (let i = 0; i < ChBitsAsc.length; i++) {
      if (ChBitsAsc[i] === 6) {
        const char = String.fromCharCode(i);
        const isNullChar = i === 0;
        const charDesc = isNullChar ? '\\0 (null)' : (i >= 32 && i <= 126) ? `'${char}'` : `\\x${i.toString(16).padStart(2, '0')}`;
        console.log(`  Char ${i.toString().padStart(3)} (${charDesc}): code=0x${ChCodeAsc[i].toString(16).padStart(4, '0')} = ${ChCodeAsc[i].toString(2).padStart(6, '0')}b`);
      }
    }
    
    console.log('');
    console.log('🎯 LOOKING FOR CODE 0x0B (001011b):');
    console.log('====================================');
    
    for (let i = 0; i < ChCodeAsc.length; i++) {
      if (ChBitsAsc[i] === 6 && (ChCodeAsc[i] & 0x3F) === 0x0B) {
        const char = String.fromCharCode(i);
        const isNullChar = i === 0;
        const charDesc = isNullChar ? '\\0 (null)' : (i >= 32 && i <= 126) ? `'${char}'` : `\\x${i.toString(16).padStart(2, '0')}`;
        console.log(`  ⭐ FOUND: Char ${i.toString().padStart(3)} (${charDesc}): code=0x${ChCodeAsc[i].toString(16).padStart(4, '0')} = ${ChCodeAsc[i].toString(2).padStart(6, '0')}b`);
      }
    }
    
    console.log('');
    console.log('🎯 LOOKING FOR CODE 0x0A (001010b):');
    console.log('====================================');
    
    for (let i = 0; i < ChCodeAsc.length; i++) {
      if (ChBitsAsc[i] === 6 && (ChCodeAsc[i] & 0x3F) === 0x0A) {
        const char = String.fromCharCode(i);
        const isNullChar = i === 0;
        const charDesc = isNullChar ? '\\0 (null)' : (i >= 32 && i <= 126) ? `'${char}'` : `\\x${i.toString(16).padStart(2, '0')}`;
        console.log(`  ⭐ EXPECTED: Char ${i.toString().padStart(3)} (${charDesc}): code=0x${ChCodeAsc[i].toString(16).padStart(4, '0')} = ${ChCodeAsc[i].toString(2).padStart(6, '0')}b`);
      }
    }
  });
});
