/// <reference path="../../index.d.ts" />
/// <reference path="./types.d.ts" />

/** @noSelf */
declare interface SignalRegistry<Source extends Byond.Datum = Byond.Datum> {
    mob_ability_base_started: (
        source: Source,
        actionTarget: Byond.Datum.Action.Cooldown,
        target: Byond.Atom
    ) => Bitflag<[ComponentBlockAbilityStart]>;
    mob_ctrl_clicked: (source: Source, target: Byond.Atom) => Bitflag<[]>;
}

type ComponentBlockAbilityStart = 1;
