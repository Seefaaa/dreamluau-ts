import * as SS13 from "SS13";

/**
 * Runs `func` on the next tick instead of right now, so it is free to call blocking procs.
 *
 * This is the escape hatch out of a must-not-sleep context, the equivalent of DM's `INVOKE_ASYNC`.
 * @param func The function to defer. Anything it captures must still be valid a tick later.
 * @async
 */
export function invokeAsync(func: (...args: any[]) => void) {
    SS13.set_timeout(0, func);
}
