/** @noSelfInFile */

/// <reference path="../../index.d.ts" />
/// <reference path="./state.d.ts" />
/// <reference path="./signals.d.ts" />
/// <reference path="./typepaths.d.ts" />

/**
 * See [SS13_base.lua](https://github.com/tgstation/tgstation/blob/a839cd44c27edb3c8cf9f0048f4afc03988787ae/lua/SS13_base.lua) for implementation.
 *
 * @noResolution
 */
declare module "SS13_base" {
    export const SSlua: SS13.SSlua;
    export const global_proc: "some_magic_bullshit";
    export const state: typeof import("state").state;

    export function get_runner_ckey(): string;

    export function get_runner_client(): Byond.Client;

    export function ispath(thing: Byond.Type, path: Byond.Type): boolean;

    export function type<T extends keyof TypePathRegistry>(type: T): Byond.Type<TypePathRegistry[T]>;
    // export function type(type: string): Byond.Type<unknown>;

    export function istype<T extends keyof TypePathRegistry>(thing: any, type: T): thing is TypePathRegistry[T];
    export function istype<T>(thing: T, type: string): thing is NonNullable<T>;

    export function typecacheof(types: string[]): Byond.List<number, Byond.Type>;

    export function is_type_in_typecache(type: Byond.Type, typecache: Byond.List<number, Byond.Type>): boolean;

    export function typesof(type: string, subtypes_only?: Byond.Bool): Byond.List<number, Byond.Type>;

    export function get_turf(thing: Byond.Atom): Byond.Turf;

    export function get_area(thing: Byond.Atom): Byond.Area;

    function __new<T extends keyof TypePathRegistry>(type: T, ...args: any[]): TypePathRegistry[T];
    // function __new<T>(type: string, ...args: any[]): T;
    function __new(type: string, ...args: any[]): unknown;

    export { __new as new };

    export function qdel(datum: Byond.Datum): boolean;

    export function is_valid(datum: Byond.Datum | undefined): datum is Byond.Datum;

    /**
     * @blocking
     */
    export function check_tick(high_priority?: Byond.Bool): void;

    /**
     * @blocking
     */
    export function await<F extends MethodsOf<GlobalProcs>, A extends Parameters<GlobalProcs[F]>>(
        thing_to_call: typeof import("SS13").global_proc,
        proc_to_call: F,
        ...args: A
    ): LuaMultiReturn<[ReturnsWhen<GlobalProcs[F], A>, string]>;
    /**
     * @blocking
     */
    export function await<T extends Byond.Datum, F extends MethodsOf<T>>(
        thing_to_call: T,
        proc_to_call: F,
        ...args: T[F] extends (...args: infer U) => any ? U : never
    ): LuaMultiReturn<[T[F] extends (...args: any[]) => infer R ? R : never, string]>;

    /**
     * @shouldnotsleep
     */
    export function register_signal<D extends Byond.Datum, S extends keyof SignalRegistry<D>>(
        datum: D,
        signal: S,
        callback: SignalRegistry<D>[S]
    ): boolean;

    export function unregister_signal<D extends Byond.Datum, S extends keyof SignalRegistry<D>>(
        datum: D,
        signal: S,
        callback?: SignalRegistry<D>[S]
    ): void;
}
