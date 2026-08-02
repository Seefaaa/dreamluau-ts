/** @noSelfInFile */

/// <reference types="lua-types/5.3" />
/// <reference types="lua-types/special/5.2-only" />

declare namespace debug {
    /**
     * See https://luau.org/library/#debug-library
     */
    function info(level: number, s: "l"): number;
}
