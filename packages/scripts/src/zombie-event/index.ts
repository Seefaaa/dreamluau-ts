import * as SS13 from "SS13";
import { invokeAsync } from "../common/async";
import { checkTick, makeClock } from "../common/tick";
import { getMutation } from "./globals";
import { setupZombieMutation } from "./mutation";

// #region Initial settings

runner = SS13.get_runner_ckey();
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

const admin = SS13.get_runner_client();

if (isLocal) {
    const human = SS13.new("/mob/living/carbon/human", SS13.get_turf(admin.mob));
    human.ckey = admin.ckey;

    setupZombieMutation(human);
} else {
    const SSdcs = dm.global_vars.SSdcs;

    SS13.unregister_signal(SSdcs, "!mob_created");

    SS13.register_signal(SSdcs, "!mob_created", (_source, mob) => {
        invokeAsync(() => {
            if (SS13.is_valid(mob) && SS13.istype(mob, "/mob/living/carbon/human")) {
                if (!getMutation(mob)) {
                    setupZombieMutation(mob);
                }
            }
        });
    });

    const clock = makeClock();

    for (const [, human] of list.filter(dm.global_vars.GLOB.mob_living_list, "/mob/living/carbon/human")) {
        checkTick(clock);

        invokeAsync(() => {
            if (SS13.is_valid(human)) setupZombieMutation(human);
        });
    }
}

// #endregion
