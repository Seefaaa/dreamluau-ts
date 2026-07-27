/** @noSelfInFile */

/**
 * @noResolution
 */
declare module "SS13_base" {
    export const SSlua: SS13.SSlua;
    export const global_proc: "some_magic_bullshit";
    export const state: typeof import("state").state;

    export function get_runner_ckey(): string;

    export function get_runner_client(): Byond.Datum;

    export function ispath(thing: Byond.Type, path: Byond.Type): Byond.Bool;

    export function type(type: string): Byond.Type;

    export function istype<T extends keyof TypePathRegistry>(thing: any, type: T): thing is TypePathRegistry[T];
    export function istype(thing: any, type: string): Byond.Bool;

    export function typecacheof(types: string[]): Byond.List<number, Byond.Type>;

    export function is_type_in_typecache(type: Byond.Type, typecache: Byond.List<number, Byond.Type>): Byond.Bool;

    export function typesof(type: string, subtypes_only?: Byond.Bool): Byond.List<number, Byond.Type>;

    export function get_turf(thing: Byond.Atom): Byond.Turf;

    export function get_area(thing: Byond.Atom): Byond.Area;

    function __new<T extends keyof TypePathRegistry>(type: T, ...args: any[]): TypePathRegistry[T];
    // function __new<T>(type: string, ...args: any[]): T;
    function __new(type: string, ...args: any[]): unknown;

    export { __new as new };

    export function qdel(datum: Byond.Datum): Byond.Bool;

    export function is_valid(datum: Byond.Datum | undefined): Byond.Bool;

    export function check_tick(high_priority?: Byond.Bool): void;

    export function await<R = unknown>(
        thing_to_call: Byond.Datum,
        proc_to_call: string,
        ...args: any[]
    ): LuaMultiReturn<[R, string]>;

    export function register_signal<D extends Byond.Datum, S extends keyof SignalRegistry<D>>(
        datum: D,
        signal: S,
        callback: SignalRegistry<D>[S]
    ): Byond.Bool;

    export function unregister_signal<F extends (...args: any[]) => any>(
        datum: Byond.Datum,
        signal: string,
        callback: F
    ): void;
}

/** @noSelf */
interface SignalRegistry<S extends Byond.Datum = Byond.Datum> {
    mob_ability_base_started: (
        source: S,
        actionTarget: Byond.Datum.Action.Cooldown,
        target: Byond.Atom
    ) => Bitflag<[ComponentBlockAbilityStart]>;
    mob_ctrl_clicked: (source: S, target: Byond.Atom) => Bitflag<[]>;
}

type Bitflag<Flags extends number[]> = Flags extends [infer First extends number, ...infer Rest extends number[]]
    ? First | Bitflag<Rest>
    : 0;

type ComponentBlockAbilityStart = 1;

interface TypePathRegistry {
    "/area": Byond.Area;

    "/atom": Byond.Atom;
    "/atom/movable": Byond.Atom.Movable;

    "/datum": Byond.Datum;
    "/datum/action/cooldown": Byond.Datum.Action.Cooldown;
    "/datum/antagonist/custom": Byond.Datum.Antagonist.Custom;
    "/datum/http_request": Byond.Datum.HttpRequest;
    "/datum/objective": Byond.Datum.Objective;

    "/icon": Byond.Icon;

    "/mob": Byond.Mob;
    "/mob/eye": Byond.Mob.Eye;
    "/mob/living/carbon/human": Byond.Mob.Living.Carbon.Human;

    "/obj": Byond.Obj;
    "/obj/item/organ/internal/zombie_infection": Byond.Obj.Item.Organ;

    "/sound": Byond.Sound;

    "/turf": Byond.Turf;

    "/world": Byond.World;
}
