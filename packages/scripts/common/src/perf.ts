let lastTimeTaken = os.clock();
let worldTime = dm.world.time;

export const timeAvg: Record<number, number> = {};
export const sleepingAt: Record<number, boolean> = {};
export const totalTimeTaken: Record<number, number> = {};
export const totalCallCount: Record<number, number> = {};

export const getReadablePerfStat = (number: number) => tostring(math.floor(number * 1_000_000) / 1_000);

let startPerfTrack = () => {
    const line = debug.info(2, "l");
    timeAvg[line] = 0;
    totalTimeTaken[line] = 0;
    totalCallCount[line] = (totalCallCount[line] ?? 0) + 1;

    worldTime = dm.world.time;
    lastTimeTaken = os.clock();
};

let checkPerf = (ignoreSleep: boolean = false) => {
    const line = debug.info(2, "l");

    if (worldTime !== dm.world.time) {
        if (ignoreSleep) return;
        sleepingAt[line] = true;
        worldTime = dm.world.time;
    }

    const currentTime = os.clock();
    const currentDiff = currentTime - lastTimeTaken;
    const prevDiff = timeAvg[line] ?? currentDiff;

    timeAvg[line] = 0.8 * prevDiff + 0.2 * currentDiff;
    totalTimeTaken[line] = (totalTimeTaken[line] ?? 0) + currentDiff;
    totalCallCount[line] = (totalCallCount[line] ?? 0) + 1;

    lastTimeTaken = currentTime;
};

// Uncomment if not perf tracking to not have any perf loss
startPerfTrack = () => {};
checkPerf = () => {};

export { checkPerf, startPerfTrack };
