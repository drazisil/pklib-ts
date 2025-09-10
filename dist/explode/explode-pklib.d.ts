/**
 * PKLib-compatible explode function that handles header parsing internally
 * This matches the C API more closely by handling the initial bit buffer properly
 */
import { ReadFunction, WriteFunction, DecompressionResult } from '../types';
/**
 * PKLib-compatible explode function that reads the header from the input stream
 * This matches the original C API where the header is part of the compressed data
 */
export declare function explodePKLib(readBuf: ReadFunction, writeBuf: WriteFunction): DecompressionResult;
export { explodePKLib as explode };
//# sourceMappingURL=explode-pklib.d.ts.map