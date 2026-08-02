/** @noSelfInFile */

import * as SS13 from "SS13";
import { checkTick, makeClock } from "../common/tick";
import { getZombieMutation } from "./globals";
import { setupZombieMutation } from "./mutation";

// #region Initial settings

admin = "sefaaa";
isLocal = true;
localClass = "Zombie";

isSpawning = false;
allowTankSpawn = true;
allowZombieControllable = false;
destructibleSpawners = false;

SS13.state.supress_runtimes = false;

// #endregion

// #region Boost subsystems

if (!isLocal) {
    const SSfastprocess = dm.global_vars.SSfastprocess;
    SSfastprocess.priority = 90; // FIRE_PRIORITY_PRIORITY_EFFECTS
    SSfastprocess.flags = _G.bit32.band(SSfastprocess.flags, _G.bit32.bnot(4)); // removes SS_BACKGROUND (1 << 2)

    const SSlua = dm.global_vars.SSlua;
    SSlua.priority = 105; // between SSmobs (100) and SStgui (110)
}

// #endregion

// #region Entry point

const client = assert(dm.global_vars.GLOB.directory.get(admin));
const user = assert(client.mob);

if (isLocal) {
    const human = SS13.new("/mob/living/carbon/human", SS13.get_turf(user));
    human.ckey = client.ckey;

    setupZombieMutation(human);
} else {
    const SSdcs = dm.global_vars.SSdcs;

    SS13.unregister_signal(SSdcs, "!mob_created");

    SS13.register_signal(SSdcs, "!mob_created", (_source, mob) => {
        SS13.set_timeout(0, () => {
            if (SS13.is_valid(mob) && SS13.istype(mob, "/mob/living/carbon/human")) {
                if (!getZombieMutation(mob)) {
                    setupZombieMutation(mob);
                }
            }
        });
    });

    const clock = makeClock();

    for (const [, human] of list.filter(dm.global_vars.GLOB.mob_living_list, "/mob/living/carbon/human")) {
        checkTick(clock);

        SS13.set_timeout(0, () => {
            if (SS13.is_valid(human)) setupZombieMutation(human);
        });
    }
}

// #endregion
