/**
 * PKLib-compatible explode function that properly handles the header and initial bit buffer
 */
import { ReadFunction, WriteFunction, DecompressionResult } from '../types';
/**
 * PKLib-compatible explode function that reads the header from the input stream
 * and properly initializes the bit buffer
 */
export declare function explodePKLib(readBuf: ReadFunction, writeBuf: WriteFunction): DecompressionResult;
export { explodePKLib as explode };
//# sourceMappingURL=explode-pklib-fixed.d.ts.map