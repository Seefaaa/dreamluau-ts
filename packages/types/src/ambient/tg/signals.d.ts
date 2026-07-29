/// <reference path="../../index.d.ts" />
/// <reference path="./types.d.ts" />

/**
 * Registry of signals that can be emitted by datums in the game.
 *
 * Each signal has a specific signature that defines the parameters and return type of the signal handler.
 *
 * You can add new signals to this registry by extending the `Signals` interface in your own code like this:
 *
 * ```ts
 * declare global {
 *    interface Signals<Source extends Byond.Datum = Byond.Datum> {
 *       my_custom_signal: (this: void, source: Source, arg1: string, arg2: number) => void;
 *    }
 * }
 *
 * @noSelf
 */
declare interface Signals<Source extends Byond.Datum = Byond.Datum> {
    mob_ability_base_started: (
        source: Source,
        actionTarget: Byond.Datum.Action.Cooldown,
        target: Byond.Atom
    ) => OneBitOf<[COMPONENT_BLOCK_ABILITY_START]>;
    mob_ctrl_clicked: (source: Source, target: Byond.Atom) => OneBitOf<[]>;
    mob_client_move_possessed_object: (
        source: Source extends Byond.Mob ? Source : never,
        new_loc: Byond.Atom,
        direct: Byond.Direction.Cardinal
    ) => OneBitOf<[COMSIG_MOB_CLIENT_BLOCK_PRE_NON_LIVING_MOVE]>;
    parent_qdeleting: (source: Source, force: Byond.Bool) => void;
    atom_expose_reagents: (
        source: Source,
        reagents: Byond.List<Byond.Datum.Reagent, number>,
        source_reagents: Byond.Datum.Reagents,
        methods: number,
        show_message: Byond.Bool
    ) => OneBitOf<[COMPONENT_NO_EXPOSE_REAGENTS]>;
    fire_casing: (
        source: Source,
        target: Byond.Atom,
        user: Byond.Mob.Living,
        fired_atom: Byond.Atom,
        randomspread: Byond.Bool | undefined,
        spread: number | undefined,
        zone_override: Enums.BodyZoneAll | undefined,
        params: string | undefined,
        distro: number | undefined,
        thrown_proj: Byond.Obj.Projectile
    ) => void;
    projectile_self_on_hit: (
        source: Source,
        firer: Byond.Atom.Movable | undefined,
        target: Byond.Atom,
        angle: number,
        hit_limb_zone: Enums.BodyZoneAll | undefined,
        blocked: number,
        pierce_hit: Byond.Bool
    ) => void;
    movable_pre_impact: (
        source: Source extends Byond.Atom.Movable ? Source : never,
        hit_atom: Byond.Atom,
        throwingdatum: Byond.Datum.ThrownThing | undefined
    ) => OneBitOf<[COMPONENT_MOVABLE_IMPACT_FLIP_HITPUSH, COMPONENT_MOVABLE_IMPACT_NEVERMIND]>;
    atom_relaymove: (
        source: Source,
        user: Byond.Mob.Living,
        direct: Byond.Direction
    ) => OneBitOf<[COMSIG_BLOCK_RELAYMOVE]>;
    mob_statchange: (source: Source extends Byond.Mob ? Source : never, new_stat: number, old_stat: number) => void;
    movable_moved: (
        source: Source extends Byond.Atom.Movable ? Source : never,
        old_loc: Byond.Atom,
        movement_dir: Byond.Direction | 0,
        forced: Byond.Bool,
        old_locs: Byond.List<number, Byond.Atom> | undefined,
        momentum_change: Byond.Bool
    ) => void;
    item_pre_attack: (
        source: Source extends Byond.Obj.Item ? Source : never,
        target: Byond.Atom,
        user: Byond.Mob.Living,
        modifiers: Byond.List<string, any> | undefined,
        attack_modifiers: Byond.List<string, any> | undefined
    ) => OneBitOf<[COMPONENT_CANCEL_ATTACK_CHAIN]> | undefined;
    living_death: (source: Source extends Byond.Mob.Living ? Source : never, gibbed: Byond.Bool) => void;
    atom_entered: (
        source: Source,
        arrived: Byond.Atom.Movable,
        old_loc: Byond.Atom,
        old_locs: Byond.List<number, Byond.Atom> | undefined
    ) => void;
    carbon_gain_organ: (
        source: Source extends Byond.Mob.Living.Carbon ? Source : never,
        organ: Byond.Obj.Item.Organ,
        special: Byond.Bool
    ) => void;
}

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
 * edit this only if the trait is actually in the game and not made up
 *
 * if it's made up, declare it in the script that uses it like this:
 *
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
declare type SignalRegistry<Source extends Byond.Datum = Byond.Datum> = Signals<Source> & {
    [K in keyof GeneratedTraitSignals]: (this: void, source: Source, trait: GeneratedTraitSignals[K]) => void;
};
