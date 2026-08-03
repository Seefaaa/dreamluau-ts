/** @noSelfInFile */

import * as SS13 from "SS13";

export const has_trait = (target: Byond.Datum, trait: string) => dm.global_procs._has_trait(target, trait) === 1;

export const to_chat = dm.global_procs.to_chat;
export const locate = dm.global_procs._locate;
export const ref = dm.global_procs.REF;
export const prob = (chance: number) => dm.global_procs._prob(chance) === 1;
export const add_trait = dm.global_procs._add_trait;
export const remove_trait = dm.global_procs._remove_trait;
export const pick_list = dm.global_procs._pick_list;
export const copytext = dm.global_procs._copytext;
export const trim = dm.global_procs.trim;
export const message_admins = dm.global_procs.message_admins;
export const key_name_admin = dm.global_procs.key_name_admin;
export const get_step = dm.global_procs._get_step;
export const get_dir = dm.global_procs._get_dir;
export const turn = dm.global_procs._turn;
export const playsound = dm.global_procs.playsound;
export const do_sparks = dm.global_procs.do_sparks;
export const explosion = dm.global_procs.explosion;

export function isSpecies<T extends PathsOf<Byond.Datum.Species>>(
    mob: Byond.Mob.Living.Carbon.Human,
    species: T
): mob is Byond.Mob.Living.Carbon.Human & { dna: { species: TypePathRegistry[T] } } {
    return dm.global_procs.is_species(mob, SS13.type(species)) === 1;
}
