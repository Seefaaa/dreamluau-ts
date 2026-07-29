/** @noSelfInFile */

/// <reference types="lua-types/5.3" />
/// <reference types="lua-types/special/5.2-only" />

declare namespace debug {
    function info(level: number, s: "l"): LuaMultiReturn<[number]>;
}
