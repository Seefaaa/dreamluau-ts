/** @noSelfInFile */

/// <reference path="../../index.d.ts" />
/// <reference path="ss13_base.d.ts" />

/**
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
