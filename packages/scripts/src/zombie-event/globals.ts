/** @noSelfInFile */

import { ref } from "../common/globals";

allMutations = allMutations ?? {};

export function getZombieMutation(human: Byond.Mob) {
    return allMutations[ref(human)];
}
