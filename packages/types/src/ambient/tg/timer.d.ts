/** @noSelfInFile */

/**
 * See [timer.lua](https://github.com/tgstation/tgstation/blob/a839cd44c27edb3c8cf9f0048f4afc03988787ae/lua/timer.lua) for implementation.
 *
 * @noResolution
 */
declare module "timer" {
    /**
     * @blocking
     */
    function wait(time: number): void;
    /**
     * Sets a timeout to execute a function after a specified time.
     * @param time The time in seconds to wait before executing the function.
     * @param func The function to execute after the timeout.
     * @async
     */
    function set_timeout(time: number, func: (...args: any[]) => any): void;
    /**
     * @async
     */
    function start_loop(time: number, amount: number, func: (iteration: number) => any): string;
    function end_loop(id: string): void;
    function stop_all_loops(): void;
}
