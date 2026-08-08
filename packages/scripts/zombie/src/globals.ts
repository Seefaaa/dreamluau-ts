/** @noSelfInFile */

import { ref } from "@scripts/common/globals";

allZombies = allZombies ?? {};

export function getZombie(human: Byond.Mob) {
    return allZombies[ref(human)];
}
