/** @noSelfInFile */

/**
 * @noResolution
 */
declare module "timer" {
    function wait(time: number): void;
    /**
     * Sets a timeout to execute a function after a specified time.
     * @param time The time in seconds to wait before executing the function.
     * @param func The function to execute after the timeout.
     */
    function set_timeout(time: number, func: (...args: any[]) => any): void;
    function start_loop(time: number, amount: number, func: (iteration: number) => any): string;
    function end_loop(id: string): void;
    function stop_all_loops(): void;
}
