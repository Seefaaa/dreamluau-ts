/** @noSelfInFile */

/// <reference path="../../index.d.ts" />
/// <reference path="ss13_base.d.ts" />

/**
 * See [SS13.lua](https://github.com/tgstation/tgstation/blob/a839cd44c27edb3c8cf9f0048f4afc03988787ae/lua/SS13.lua) for implementation.
 *
 * @noResolution
 */
declare module "SS13" {
    export * from "SS13_base";
    export {
        end_loop,
        set_timeout,
        start_loop,
        stop_all_loops,
        wait,
    } from "timer";
}
