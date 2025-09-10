/**
 * PKWARE lookup tables - TypeScript port
 * Based on PKWareLUTs.c from pklib
 */
export declare const DistBits: Uint8Array;
export declare const DistCode: Uint8Array;
export declare const ExLenBits: Uint8Array;
export declare const LenBase: Uint16Array;
export declare const LenBits: Uint8Array;
export declare const LenCode: Uint8Array;
export declare const ChBitsAsc: Uint8Array;
export declare const ChCodeAsc: Uint16Array;
export declare function getLUTSizeConstants(): {
    own_size: number;
    DIST_SIZES: number;
    CH_BITS_ASC_SIZE: number;
    LENS_SIZES: number;
};
//# sourceMappingURL=PKWareLUTs.d.ts.map