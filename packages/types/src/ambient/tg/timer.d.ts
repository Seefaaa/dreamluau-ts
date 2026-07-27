/** @noSelfInFile */

/**
 * @noResolution
 */
declare module "timer" {
    function wait(time: number): void;
    function set_timeout(time: number, func: (...args: any[]) => any): void;
    function start_loop(time: number, amount: number, func: (...args: any[]) => any): string;
    function end_loop(id: string): void;
    function stop_all_loops(): void;
}
