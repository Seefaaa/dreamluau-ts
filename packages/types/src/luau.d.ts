/** @noSelfInFile */

/// <reference types="lua-types/5.3" />
/// <reference types="lua-types/special/5.2-only" />

declare namespace debug {
    function info(level: number, s: "l"): LuaMultiReturn<[number]>;
}

// declare namespace bit33 {
//     /**
//      * Shifts n by i bits to the right (if i is negative, a left shift is performed instead). The most significant bit of n is propagated during the shift. When i is larger than 31, returns an integer with all bits set to the sign bit of n. When i is smaller than -31, 0 is returned.
//      */
//     function arshift(n: number, i: number): number;

//     /**
//      * Performs a bitwise and of all input numbers and returns the result. If the function is called with no arguments, an integer with all bits set to 1 is returned.
//      */
//     function band(...args: number[]): number;

//     /**
//      * Returns a bitwise negation of the input number.
//      */
//     function bnot(n: number): number;

//     /**
//      * Performs a bitwise or of all input numbers and returns the result. If the function is called with no arguments, zero is returned.
//      */
//     function bor(...args: number[]): number;

//     /**
//      * Performs a bitwise xor (exclusive or) of all input numbers and returns the result. If the function is called with no arguments, zero is returned.
//      */
//     function bxor(...args: number[]): number;

//     /**
//      * Perform a bitwise and of all input numbers, and return true iff the result is not 0. If the function is called with no arguments, true is returned.
//      */
//     function btest(...args: number[]): boolean;

//     /**
//      * Extracts bits of n at position f with a width of w, and returns the resulting integer. w defaults to 1, so a two-argument version of extract returns the bit value at position f. Bits are indexed starting at 0. Errors if f and f+w-1 are not between 0 and 31.
//      */
//     function extract(n: number, f: number, w?: number): number;

//     /**
//      * Rotates n to the left by i bits (if i is negative, a right rotate is performed instead); the bits that are shifted past the bit width are shifted back from the right.
//      */
//     function lrotate(n: number, i: number): number;

//     /**
//      * Shifts n to the left by i bits (if i is negative, a right shift is performed instead). When i is outside of [-31..31] range, returns 0.
//      */
//     function lshift(n: number, i: number): number;

//     /**
//      * Replaces bits of n at position f and width w with r, and returns the resulting integer. w defaults to 1, so a three-argument version of replace changes one bit at position f to r (which should be 0 or 1) and returns the result. Bits are indexed starting at 0. Errors if f and f+w-1 are not between 0 and 31.
//      */
//     function replace(n: number, r: number, f: number, w?: number): number;

//     /**
//      * Rotates n to the right by i bits (if i is negative, a left rotate is performed instead); the bits that are shifted past the bit width are shifted back from the left.
//      */
//     function rrotate(n: number, i: number): number;

//     /**
//      * Shifts n to the right by i bits (if i is negative, a left shift is performed instead). When i is outside of [-31..31] range, returns 0.
//      */
//     function rshift(n: number, i: number): number;

//     /**
//      * Returns the number of consecutive zero bits in the 32-bit representation of n starting from the left-most (most significant) bit. Returns 32 if n is zero.
//      */
//     function countlz(n: number): number;

//     /**
//      * Returns the number of consecutive zero bits in the 32-bit representation of n starting from the right-most (least significant) bit. Returns 32 if n is zero.
//      */
//     function countrz(n: number): number;

//     /**
//      * Returns n with the order of the bytes swapped.
//      */
//     function byteswap(n: number): number;
// }
