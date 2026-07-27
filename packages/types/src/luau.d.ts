/** @noSelfInFile */

/// <reference types="lua-types/5.3" />

declare namespace debug {
    function info(level: number, s: "l"): LuaMultiReturn<[number]>;
}
