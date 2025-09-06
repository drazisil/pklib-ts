import { ChBitsAsc, ChCodeAsc } from '../src/PKWareLUT/PKWareLUTs';

describe('ASCII Table Analysis', () => {
  test('should analyze character 106 encoding', () => {
    console.log('\n🔍 Character 106 (\'j\') analysis:');
    console.log(`ChCodeAsc[106]: 0x${ChCodeAsc[106].toString(16).padStart(4, '0')} (${ChCodeAsc[106]})`);
    console.log(`ChBitsAsc[106]: ${ChBitsAsc[106]}`);
    
    console.log('\n🔍 Character 124 (\'|\') analysis:');
    console.log(`ChCodeAsc[124]: 0x${ChCodeAsc[124].toString(16).padStart(4, '0')} (${ChCodeAsc[124]})`);
    console.log(`ChBitsAsc[124]: ${ChBitsAsc[124]}`);
    
    console.log('\n🔍 Difference analysis:');
    console.log(`106 ^ 124 = ${106 ^ 124} (0x${(106 ^ 124).toString(16)})`);
    console.log(`106 + 18 = ${106 + 18}`);
    console.log(`106 | 18 = ${106 | 18}`);
    
    // Check nearby characters
    console.log('\n🔍 Nearby character encodings:');
    for (let i = 104; i <= 126; i++) {
      console.log(`Char ${i} ('${String.fromCharCode(i)}'): code=0x${ChCodeAsc[i].toString(16).padStart(4, '0')}, bits=${ChBitsAsc[i]}`);
    }
  });
});
