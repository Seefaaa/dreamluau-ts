/** @noSelfInFile */

import * as SS13 from "SS13";
import { isSpecies, ref } from "@scripts/common/globals";
import * as HandlerGroup from "handler_group";

export function getPlane(newPlane: number, zReference: Byond.Atom): number {
    const SSmapping = dm.global_vars.SSmapping;

    if (SSmapping.max_plane_offset !== 0) {
        let turfPlaneOffsets = 0;

        if (SSmapping.max_plane_offset !== undefined && SS13.istype(zReference, "/atom")) {
            if (zReference.z !== undefined) {
                turfPlaneOffsets = SSmapping.z_level_to_plane_offset[zReference.z] ?? 0;
            } else {
                const offset = SSmapping.plane_to_offset[tostring(zReference.plane)];
                if (offset && offset !== 0) {
                    turfPlaneOffsets = offset;
                } else {
                    turfPlaneOffsets = zReference.plane;
                }
            }
        }

        const planeOffsetBlacklist = SSmapping.plane_offset_blacklist;

        if (planeOffsetBlacklist === undefined || planeOffsetBlacklist[tostring(newPlane)]) {
            return newPlane;
        } else {
            return newPlane - 100 * turfPlaneOffsets;
        }
    } else {
        return newPlane;
    }
}

export const createHref = (target: Byond.Atom, params: string, content: string): string =>
    `<a href="byond://?src=${ref(target)};${params}">${content}</a>`;

export const isZombieSpecies = (mob: Byond.Mob.Living.Carbon.Human) =>
    isSpecies(mob, "/datum/species/zombie/infectious");

export function makeHearersVulnerable(position: Byond.Atom) {
    const hearers = dm.global_procs.get_hearers_in_range(6, position);
    if (!hearers) return;

    const group = HandlerGroup.new();

    // atom_expose_reagents signal runs many times, so better cache to avoid overhead
    const infected: Record<string, true> = {};

    for (const [, hearer] of list.filter(hearers, "/mob/living/carbon/human")) {
        group.register_signal(hearer, "atom_expose_reagents", (_source, reagents) => {
            if (infected[ref(hearer)]) return 0;

            for (const [, reagent] of reagents) {
                if (SS13.istype(reagent, "/datum/reagent/blob/networked_fibers")) {
                    infected[ref(hearer)] = true;
                    infectTarget(hearer);
                    break;
                }
            }

            return 0;
        });
    }

    SS13.set_timeout(5, () => group.clear());
}

/**
 * Inserts a zombie infection organ into the specified human mob if they do not already have one.
 *
 * @param human The human mob to infect with a zombie infection organ.
 */
export function infectTarget(human: Byond.Mob.Living.Carbon.Human) {
    if (SS13.is_valid(human.get_organ_slot("zombie_infection"))) {
        return;
    }

    const infection = SS13.new("/obj/item/organ/zombie_infection");
    infection.Insert(human);
}
