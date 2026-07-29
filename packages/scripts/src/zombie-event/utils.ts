/** @noSelfInFile */

import * as SS13 from "SS13";
import { isSpecies } from "../common/globals";

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

export const isZombieSpecies = (mob: Byond.Mob.Living.Carbon.Human) =>
    isSpecies(mob, "/datum/species/zombie/infectious");
