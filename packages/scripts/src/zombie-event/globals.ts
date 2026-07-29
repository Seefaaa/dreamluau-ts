/** @noSelfInFile */

import { ref } from "../common/globals";
import type { MutationData } from "./mutation";

declare var allHumanData: Record<string, MutationData>;
allHumanData = allHumanData ?? {};

export function getZombieMutation(human: Byond.Mob) {
    return allHumanData[ref(human)];
}
