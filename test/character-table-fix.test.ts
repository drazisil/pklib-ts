import { ChBitsAsc, ChCodeAsc } from '../src/PKWareLUT/PKWareLUTs';

describe('Character Table Fix Verification', () => {
  test('Verify character h should use PKLib encoding', () => {
    const charH = 104; // 'h'
    
    console.log('🔍 CHARACTER TABLE ANALYSIS');
    console.log('============================');
    
    // PKLib standard for character 'h'
    const pklibBits = ChBitsAsc[charH];
    const pklibCode = ChCodeAsc[charH];
    
    console.log(`PKLib standard for 'h' (${charH}):`);
    console.log(`  Bits: ${pklibBits}`);
    console.log(`  Code: 0x${pklibCode.toString(16).padStart(4, '0')} = ${pklibCode.toString(2).padStart(pklibBits, '0')}b`);
    console.log('');
    
    // Our current algorithm
    let ourBits, ourCode;
    if (charH >= 32 && charH <= 126) {
      ourBits = 7;
      ourCode = charH - 32;
    } else {
      ourBits = 9;
      ourCode = (charH < 32) ? charH + 256 : charH + 128;
    }
    
    console.log(`Our current algorithm for 'h' (${charH}):`);
    console.log(`  Bits: ${ourBits}`);
    console.log(`  Code: 0x${ourCode.toString(16).padStart(4, '0')} = ${ourCode.toString(2).padStart(ourBits, '0')}b`);
    console.log('');
    
    // Comparison
    console.log('🚨 PROBLEM IDENTIFIED:');
    console.log('=======================');
    console.log(`Expected bit count: ${pklibBits}, Our bit count: ${ourBits}`);
    console.log(`Expected code: 0x${pklibCode.toString(16).padStart(4, '0')}, Our code: 0x${ourCode.toString(16).padStart(4, '0')}`);
    
    if (pklibBits === 6 && pklibCode === 0x0A) {
      console.log('✅ PKLib expects character "h" to use 6 bits with code 0x0A (001010b)');
      console.log('❌ Our algorithm uses 7 bits with code 0x48 (1001000b)');
      console.log('');
      console.log('🎯 THE FIX: Use PKLib character tables (ChBitsAsc, ChCodeAsc) instead of custom algorithm!');
    }
    
    expect(pklibBits).toBe(6);
    expect(pklibCode).toBe(0x0A);
  });
});
