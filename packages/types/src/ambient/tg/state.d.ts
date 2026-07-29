/** @noSelfInFile */

/**
 * See [state.lua](https://github.com/tgstation/tgstation/blob/a839cd44c27edb3c8cf9f0048f4afc03988787ae/lua/state.lua) for implementation.
 *
 * @noResolution
 */
declare module "state" {
    export const state: {
        readonly internal_id: unknown;
        supress_runtimes: boolean;
    };
}
