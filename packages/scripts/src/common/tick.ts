/**
 * Yields execution until the next tick. This is useful for waiting for the server to catch up after a long-running operation.
 *
 * `world.tick_lag` is how many deciseconds a tick should complete in (like reverse fps)
 *
 * `_exec.time` is the time we spent in the current tick in milliseconds.
 *
 * So `_exec.time / (dm.world.tick_lag * 100)` equals to `world.tick_usage / 100`.
 *
 * What is `world.tick_usage`? It is the percentage of the spent budget of the current tick.
 *
 * Why don't we just use `world.tick_usage`? Because it isn't updated during our consecutive
 * executions, so we need to calculate it ourselves.
 *
 * In conclusion, if `_exec.time` takes more than 85% of the tick time, we better sleep to avoid lagging.
 *
 * @param worldTime The time of the world when we started executing this tick. If it is different from the current world time, it means we slept somewhere in between.
 * @returns Whether we should sleep or not.
 */
export function tickLag(worldTime: number): boolean {
    if (dm.world.time !== worldTime) {
        print("We slept somewhere!");
        return true;
    }
    return _exec.time / (dm.world.tick_lag * 100) > 0.85;
}

/**
 * Creates a clock that remembers the world time it was last synced at, to be passed into `checkTick`.
 *
 * Create one right before a loop, and call `checkTick` on it inside the loop.
 *
 * @example
 * ```ts
 * const clock = makeClock();
 *
 * for (const [, human] of list.filter(dm.global_vars.GLOB.mob_living_list, "/mob/living/carbon/human")) {
 *     checkTick(clock);
 *     setupZombieMutation(human);
 * }
 * ```
 *
 * @returns A clock holding the current world time.
 */
export function makeClock(): { time: number } {
    return { time: dm.world.time };
}

/**
 * Sleeps if we have used up too much of the current tick, then resyncs the clock to the new world time.
 *
 * Call this on every iteration of a loop that touches a lot of objects, otherwise the loop keeps running
 * inside a single tick and lags the server.
 *
 * Keep in mind that this can yield, so anything that must not sleep (a signal handler, for example)
 * should not call it.
 *
 * @example
 * ```ts
 * const clock = makeClock();
 *
 * for (const [, mob] of list.filter(dm.world.contents, "/mob")) {
 *     checkTick(clock);
 *     somethingThatTakesALongTime(mob);
 * }
 * ```
 *
 * @param clock The clock created by `makeClock` for this loop.
 */
export function checkTick(clock: { time: number }): void {
    if (tickLag(clock.time)) {
        sleep();
        clock.time = dm.world.time;
    }
}
