import { ChBitsAsc, ChCodeAsc } from '../PKWareLUT/PKWareLUTs';

describe('Character h Analysis', () => {
  test('Check character h encoding', () => {
    const charH = 104; // 'h'
    
    console.log(`Character 'h' (${charH}):`);
    console.log(`  ChBitsAsc[${charH}] = ${ChBitsAsc[charH]} bits`);
    console.log(`  ChCodeAsc[${charH}] = 0x${ChCodeAsc[charH].toString(16).padStart(4, '0')} = ${ChCodeAsc[charH].toString(2).padStart(ChBitsAsc[charH], '0')}b`);
    
    // Also check what our current code is generating
    console.log('');
    console.log('Current algorithm for h:');
    if (charH >= 32 && charH <= 126) {
      console.log(`  Using 7 bits, code = ${charH - 32} = 0x${(charH - 32).toString(16).padStart(2, '0')} = ${(charH - 32).toString(2).padStart(7, '0')}b`);
    } else {
      const code = (charH < 32) ? charH + 256 : charH + 128;
      console.log(`  Using 9 bits, code = ${code} = 0x${code.toString(16).padStart(3, '0')} = ${code.toString(2).padStart(9, '0')}b`);
    }
  });
});
