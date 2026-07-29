/// <reference path="../../index.d.ts" />
/// <reference path="./types.d.ts" />

// keep in alphabetical order
declare interface TypePathRegistry {
    "/area": Byond.Area;

    "/atom": Byond.Atom;
    "/atom/movable": Byond.Atom.Movable;

    "/datum": Byond.Datum;
    "/datum/action/cooldown": Byond.Datum.Action.Cooldown;
    "/datum/antagonist/custom": Byond.Datum.Antagonist.Custom;
    "/datum/fluid_group": Byond.Datum.FluidGroup;
    "/datum/http_request": Byond.Datum.HttpRequest;
    "/datum/mind": Byond.Datum.Mind;
    "/datum/movespeed_modifier/admin_varedit": Byond.Datum.MoveSpeedModifier.AdminVaredit;
    "/datum/objective": Byond.Datum.Objective;
    "/datum/reagent": Byond.Datum.Reagent;
    "/datum/reagent/blob": Byond.Datum.Reagent.Blob;
    "/datum/reagent/blob/networked_fibers": Byond.Datum.Reagent.Blob.NetworkedFibers;
    "/datum/species": Byond.Datum.Species;
    "/datum/species/human": Byond.Datum.Species.Human;
    "/datum/species/zombie": Byond.Datum.Species.Zombie;
    "/datum/species/zombie/infectious": Byond.Datum.Species.Zombie.Infectious;

    "/icon": Byond.Icon;

    "/mob": Byond.Mob;
    "/mob/eye": Byond.Mob.Eye;
    "/mob/living/carbon/human": Byond.Mob.Living.Carbon.Human;

    "/obj": Byond.Obj;
    "/obj/effect/particle_effect/fluid": Byond.Obj.Effect.ParticleEffect.Fluid;
    "/obj/effect/particle_effect/fluid/foam": Byond.Obj.Effect.ParticleEffect.Fluid.Foam;
    "/obj/effect/particle_effect/fluid/foam/short_life": Byond.Obj.Effect.ParticleEffect.Fluid.Foam.ShortLife;
    "/obj/item/ammo_casing/magic/hook": Byond.Obj.Item.AmmoCasing.Magic.Hook;
    "/obj/item/organ/zombie_infection": Byond.Obj.Item.Organ.ZombieInfection;
    "/obj/structure": Byond.Obj.Structure;
    "/obj/structure/barricade/wooden/crude": Byond.Obj.Structure.Barricade.Wooden.Crude;
    "/obj/structure/window": Byond.Obj.Structure.Window;

    "/sound": Byond.Sound;

    "/turf": Byond.Turf;

    "/world": Byond.World;
}

declare type TypePathOf<T> = {
    [K in keyof TypePathRegistry]: TypePathRegistry[K] extends T ? (T extends TypePathRegistry[K] ? K : never) : never;
}[keyof TypePathRegistry];
