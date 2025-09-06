import fs from 'fs';
import path from 'path';

describe('Hex Dump Analysis', () => {
  it('should analyze hex dump of external files', () => {
    const originalDir = path.join(__dirname, '../../test-fixtures');
    const externalCompressed = fs.readFileSync(path.join(originalDir, 'binary.imploded'));

    console.log('External binary file hex dump (first 20 bytes):');
    for (let i = 0; i < Math.min(20, externalCompressed.length); i++) {
      const hex = externalCompressed[i].toString(16).padStart(2, '0');
      console.log(`Byte ${i}: 0x${hex} (${externalCompressed[i]})`);
    }

    console.log('\nFull first 20 bytes:');
    const first20 = Array.from(externalCompressed.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(first20);
    
    expect(externalCompressed.length).toBeGreaterThan(0);
  });
});
