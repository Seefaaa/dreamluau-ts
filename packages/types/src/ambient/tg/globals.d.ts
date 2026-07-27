/// <reference path="../../index.d.ts" />
/// <reference path="types.d.ts" />

declare interface GlobalVars {
    SSfastprocess: SS13.SSfastprocess;
    SSlua: SS13.SSlua;
    SSmapping: SS13.SSmapping;
    SSmobs: SS13.SSmobs;
    SSspatial_grid: SS13.SSspatial_grid;
}

/** @noSelf */
declare interface GlobalProcs {
    REF(thing: Byond.Datum): string;
    _has_trait(target: Byond.Datum, trait: string): Byond.Bool;
    _prob(chance: number): Byond.Bool;
    _locate(x: number, y: number, z: number): Byond.Turf;
    _block(point1: Byond.Turf, point2: Byond.Turf): Byond.List<number, Byond.Turf>;
    to_chat(user: Byond.Datum, message: string): void;
    trim(string: string): string;
    _copytext(text: string, from: number, to: number): string;
    relay_to_list_and_observers(
        message: string,
        mob_list: Byond.List<number, Byond.Mob> | Byond.Mob[],
        source: Byond.Atom,
        message_type?: number
    ): void;
    _add_trait(target: Byond.Datum, trait: string, source: string): void;

    /**
     * The exact same as get_hearers_in_view, but not limited by visibility. Does no filtering for traits, line of sight, or any other such criteria.
     * Filtering is intended to be done by whatever calls this function.
     *
     * This function exists to allow for mobs to hear speech without line of sight, if such a thing is needed.
     *
     * * radius - what radius search circle we are using, worse performance as this increases
     * * source - object at the center of our search area. everything in get_turf(source) is guaranteed to be part of the search area
     * * contents_type - the type of contents we want to be looking for. defaults to hearing sensitive
     */
    get_hearers_in_range(
        range: number,
        source: Byond.Atom,
        contents_type?:
            | "recursive_contents_area_sensitive"
            | "recursive_contents_hearing_sensitive"
            | "recursive_contents_client_mobs"
            | "recursive_contents_active_storage"
    ): Byond.List<number, Byond.Atom.Movable>;
}
