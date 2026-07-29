let lastTimeTaken = os.clock();
let worldTime = dm.world.time;

const timeAvg: Record<number, number> = {};
const sleepingAt: Record<number, boolean> = {};
const totalTimeTaken: Record<number, number> = {};
const totalCallCount: Record<number, number> = {};

let startPerfTrack = () => {
    worldTime = dm.world.time;

    const [line] = debug.info(2, "l");
    timeAvg[line] = 0;
    totalTimeTaken[line] = 0;
    totalCallCount[line] = (totalCallCount[line] ?? 0) + 1;

    lastTimeTaken = os.clock();
};

let checkPerf = (ignoreSleep: boolean = false) => {
    const [line] = debug.info(2, "l");

    if (worldTime !== dm.world.time) {
        if (ignoreSleep) {
            return;
        }
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
