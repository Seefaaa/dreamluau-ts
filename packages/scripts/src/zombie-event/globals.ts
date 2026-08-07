/** @noSelfInFile */

import { ref } from "../common/globals";

allMutations = allMutations ?? {};

export function getMutation(human: Byond.Mob) {
    return allMutations[ref(human)];
}
