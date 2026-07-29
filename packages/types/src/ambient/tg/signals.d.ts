/// <reference path="../../index.d.ts" />
/// <reference path="./types.d.ts" />

/**
 * Registry of signals that can be emitted by datums in the game.
 *
 * Each signal has a specific signature that defines the parameters and return type of the signal handler.
 *
 * You can add new signals to this registry by extending the `Signals` interface in your own code like this:
 *
 * @example
 * ```ts
 * declare global {
 *    `/** @noSelf * /` // without the space between `* /` and remove backticks
 *    interface Signals<S extends Byond.Datum> {
 *       my_custom_signal: (this: void, source: S, arg1: string, arg2: number) => Signal;
 *       my_other_signal: (this: void, source: S, target: Byond.Atom) => Signal<[COMPONENT_BLOCK_OTHER]>;
 *    }
 * }
 * ```
 *
 * You don't have to add both the `this: void` and `@noSelf` annotations together, pick one.
 *
 * @noSelf
 */
declare interface Signals<S extends Byond.Datum> {
    mob_ability_base_started: (
        source: S,
        actionTarget: Byond.Datum.Action.Cooldown,
        target: Byond.Atom
    ) => Signal<[COMPONENT_BLOCK_ABILITY_START]>;
    mob_ctrl_clicked: (source: S, target: Byond.Atom) => Signal;
    mob_client_move_possessed_object: (
        source: S extends Byond.Mob ? S : never,
        new_loc: Byond.Atom,
        direct: Byond.Direction.Cardinal
    ) => Signal<[COMSIG_MOB_CLIENT_BLOCK_PRE_NON_LIVING_MOVE]>;
    parent_qdeleting: (source: S, force: Byond.Bool) => Signal;
    atom_expose_reagents: (
        source: S,
        reagents: Byond.List<Byond.Datum.Reagent, number>,
        source_reagents: Byond.Datum.Reagents,
        methods: number,
        show_message: Byond.Bool
    ) => Signal<[COMPONENT_NO_EXPOSE_REAGENTS]>;
    fire_casing: (
        source: S,
        target: Byond.Atom,
        user: Byond.Mob.Living,
        fired_atom: Byond.Atom,
        randomspread: Byond.Bool | undefined,
        spread: number | undefined,
        zone_override: Enums.BodyZoneAll | undefined,
        params: string | undefined,
        distro: number | undefined,
        thrown_proj: Byond.Obj.Projectile
    ) => Signal;
    projectile_self_on_hit: (
        source: S,
        firer: Byond.Atom.Movable | undefined,
        target: Byond.Atom,
        angle: number,
        hit_limb_zone: Enums.BodyZoneAll | undefined,
        blocked: number,
        pierce_hit: Byond.Bool
    ) => Signal;
    movable_pre_impact: (
        source: S extends Byond.Atom.Movable ? S : never,
        hit_atom: Byond.Atom,
        throwingdatum: Byond.Datum.ThrownThing | undefined
    ) => Signal<[COMPONENT_MOVABLE_IMPACT_FLIP_HITPUSH, COMPONENT_MOVABLE_IMPACT_NEVERMIND]>;
    atom_relaymove: (source: S, user: Byond.Mob.Living, direct: Byond.Direction) => Signal<[COMSIG_BLOCK_RELAYMOVE]>;
    mob_statchange: (source: S extends Byond.Mob ? S : never, new_stat: number, old_stat: number) => Signal;
    movable_moved: (
        source: S extends Byond.Atom.Movable ? S : never,
        old_loc: Byond.Atom,
        movement_dir: Byond.Direction | 0,
        forced: Byond.Bool,
        old_locs: Byond.List<number, Byond.Atom> | undefined,
        momentum_change: Byond.Bool
    ) => Signal;
    item_pre_attack: (
        source: S extends Byond.Obj.Item ? S : never,
        target: Byond.Atom,
        user: Byond.Mob.Living,
        modifiers: Byond.List<string, any> | undefined,
        attack_modifiers: Byond.List<string, any> | undefined
    ) => Signal<[COMPONENT_CANCEL_ATTACK_CHAIN]>;
    living_death: (source: S extends Byond.Mob.Living ? S : never, gibbed: Byond.Bool) => Signal;
    atom_entered: (
        source: S,
        arrived: Byond.Atom.Movable,
        old_loc: Byond.Atom,
        old_locs: Byond.List<number, Byond.Atom> | undefined
    ) => Signal;
    carbon_gain_organ: (
        source: S extends Byond.Mob.Living.Carbon ? S : never,
        organ: Byond.Obj.Item.Organ,
        special: Byond.Bool
    ) => Signal;
}

declare type Signal<B = void> = B extends [number, ...number[]]
    ? OneBitOf<B> | undefined
    : B extends void
      ? // biome-ignore lint/suspicious/noConfusingVoidType: this is a return type
        void
      : never;

// mob_ability_base_started
type COMPONENT_BLOCK_ABILITY_START = 1;

// mob_client_move_possessed_object
type COMSIG_MOB_CLIENT_BLOCK_PRE_NON_LIVING_MOVE = 1;

// atom_expose_reagents
type COMPONENT_NO_EXPOSE_REAGENTS = 1;

// movable_pre_impact
type COMPONENT_MOVABLE_IMPACT_FLIP_HITPUSH = 1;
type COMPONENT_MOVABLE_IMPACT_NEVERMIND = 2;

// atom_relaymove
type COMSIG_BLOCK_RELAYMOVE = 1;

// item_pre_attack
type COMPONENT_CANCEL_ATTACK_CHAIN = 1;

/**
 * Edit this only if the trait is actually in the game and not made up
 *
 * If it's made up, declare it in the script that uses it like this:
 *
 * @example
 * ```ts
 * declare global {
 *     interface TraitSignals {
 *         "example": true;
 *     }
 * }
 * ```
 */
declare interface TraitSignals {
    // example: true;
    floored: true;
}

// do not edit
type GeneratedTraitSignals = {
    [K in keyof TraitSignals as `addtrait ${K}` | `removetrait ${K}`]: TraitSignals[K] extends true ? K : never;
};

// do not edit this, it is generated from the above interfaces
declare type SignalRegistry<S extends Byond.Datum = Byond.Datum> = Signals<S> & {
    [K in keyof GeneratedTraitSignals]: (this: void, source: S, trait: GeneratedTraitSignals[K]) => void;
};
