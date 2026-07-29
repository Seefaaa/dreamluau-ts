/** @noSelfInFile */

/** biome-ignore-all lint/correctness/noUnusedVariables: wip */

import * as SS13 from "SS13";

const isLocal = false;
const admin = "sefaaa";
const localClass = "Zombie (AI)";
const allowZombieControllable = false;
const isSpawning = false;

SS13.state.supress_runtimes = true;

function tickLag(_tickUsageStart: number, worldTime: number): boolean {
    if (dm.world.time !== worldTime) {
        print("We slept somewhere!");
        return true;
    }
    return _exec.time / (dm.world.tick_lag * 100) > 0.85;
}

if (!isLocal) {
    const SSfastprocess = dm.global_vars.SSfastprocess;
    SSfastprocess.priority = 90;
    SSfastprocess.flags = _G.bit32.band(SSfastprocess.flags, _G.bit32.bnot(4));

    const SSlua = dm.global_vars.SSlua;
    SSlua.priority = 110;
}

const maxPathfindingRange = 15;

sleep();

const blockActivation = 1;

// #region Declarations

declare global {
    interface TraitSignals {
        hooked: true; // used by smoker_hook ability
    }
}

// #endregion
