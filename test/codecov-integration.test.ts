import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Codecov Integration', () => {
  const coverageDir = join(__dirname, '../coverage');
  
  it('should generate lcov.info file after running coverage', () => {
    const lcovPath = join(coverageDir, 'lcov.info');
    expect(existsSync(lcovPath)).toBe(true);
    
    const lcovContent = readFileSync(lcovPath, 'utf8');
    expect(lcovContent).toContain('TN:'); // Test name line
    expect(lcovContent).toContain('SF:'); // Source file line
    expect(lcovContent).toContain('src/'); // Should contain source files
  });

  it('should generate clover.xml file after running coverage', () => {
    const cloverPath = join(coverageDir, 'clover.xml');
    expect(existsSync(cloverPath)).toBe(true);
    
    const cloverContent = readFileSync(cloverPath, 'utf8');
    expect(cloverContent).toContain('<?xml version="1.0"');
    expect(cloverContent).toContain('<coverage');
  });

  it('should exclude test files from coverage collection', () => {
    const lcovPath = join(coverageDir, 'lcov.info');
    const lcovContent = readFileSync(lcovPath, 'utf8');
    
    // Should not contain test files in coverage
    expect(lcovContent).not.toContain('SF:test/');
    expect(lcovContent).not.toContain('.test.ts');
    expect(lcovContent).not.toContain('.spec.ts');
  });

  it('should include main source files in coverage', () => {
    const lcovPath = join(coverageDir, 'lcov.info');
    const lcovContent = readFileSync(lcovPath, 'utf8');
    
    // Should include main source files
    expect(lcovContent).toContain('SF:src/index.ts');
    expect(lcovContent).toContain('SF:src/types.ts');
    expect(lcovContent).toContain('SF:src/explode/explode.ts');
    expect(lcovContent).toContain('SF:src/implode/implode.ts');
  });
});