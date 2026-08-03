/// <reference path="../../index.d.ts" />
/// <reference path="./types.d.ts" />

// keep in alphabetical order
declare interface TypePathRegistry {
    "/area": Byond.Area;

    "/atom": Byond.Atom;
    "/atom/movable": Byond.Atom.Movable;
    "/atom/movable/render_step": Byond.Atom.Movable.RenderStep;
    "/atom/movable/render_step/emissive_blocker": Byond.Atom.Movable.RenderStep.EmissiveBlocker;

    "/datum": Byond.Datum;
    "/datum/action/cooldown": Byond.Datum.Action.Cooldown;
    "/datum/admins": Byond.Datum.Admins;
    "/datum/antagonist/custom": Byond.Datum.Antagonist.Custom;
    "/datum/bank_account": Byond.Datum.BankAccount;
    "/datum/browser": Byond.Datum.Browser;
    "/datum/component": Byond.Datum.Component;
    "/datum/component/orbiter": Byond.Datum.Component.Orbiter;
    "/datum/drift_handler": Byond.Datum.DriftHandler;
    "/datum/effect_system": Byond.Datum.EffectSystem;
    "/datum/effect_system/basic": Byond.Datum.EffectSystem.Basic;
    "/datum/effect_system/basic/spark_spread": Byond.Datum.EffectSystem.Basic.SparkSpread;
    "/datum/effect_system/basic/spark_spread/quantum": Byond.Datum.EffectSystem.Basic.SparkSpread.Quantum;
    "/datum/effect_system/fluid_spread": Byond.Datum.EffectSystem.FluidSpread;
    "/datum/effect_system/fluid_spread/foam": Byond.Datum.EffectSystem.FluidSpread.Foam;
    "/datum/effect_system/fluid_spread/foam/short": Byond.Datum.EffectSystem.FluidSpread.Foam.Short;
    "/datum/element": Byond.Datum.Element;
    "/datum/element/footstep": Byond.Datum.Element.Footstep;
    "/datum/element/wall_tearer": Byond.Datum.Element.WallTearer;
    "/datum/fluid_group": Byond.Datum.FluidGroup;
    "/datum/gas_mixture": Byond.Datum.GasMixture;
    "/datum/http_request": Byond.Datum.HttpRequest;
    "/datum/id_trim": Byond.Datum.IdTrim;
    "/datum/job": Byond.Datum.Job;
    "/datum/language": Byond.Datum.Language;
    "/datum/language_holder": Byond.Datum.LanguageHolder;
    "/datum/mind": Byond.Datum.Mind;
    "/datum/movement_packet": Byond.Datum.MovementPacket;
    "/datum/movespeed_modifier/admin_varedit": Byond.Datum.MoveSpeedModifier.AdminVaredit;
    "/datum/objective": Byond.Datum.Objective;
    "/datum/outfit": Byond.Datum.Outfit;
    "/datum/outfit/job": Byond.Datum.Outfit.Job;
    "/datum/outfit/job/assistant": Byond.Datum.Outfit.Job.Assistant;
    "/datum/pod_style": Byond.Datum.PodStyle;
    "/datum/pod_style/centcom": Byond.Datum.PodStyle.Centcom;
    "/datum/reagent": Byond.Datum.Reagent;
    "/datum/reagent/blob": Byond.Datum.Reagent.Blob;
    "/datum/reagent/blob/networked_fibers": Byond.Datum.Reagent.Blob.NetworkedFibers;
    "/datum/saymode": Byond.Datum.Saymode;
    "/datum/sprite_accessory": Byond.Datum.SpriteAccessory;
    "/datum/sprite_accessory/clothing": Byond.Datum.SpriteAccessory.Clothing;
    "/datum/species": Byond.Datum.Species;
    "/datum/species/human": Byond.Datum.Species.Human;
    "/datum/species/zombie": Byond.Datum.Species.Zombie;
    "/datum/species/zombie/infectious": Byond.Datum.Species.Zombie.Infectious;
    "/datum/status_effect": Byond.Datum.StatusEffect;
    "/datum/status_effect/incapacitating": Byond.Datum.StatusEffect.Incapacitating;
    "/datum/status_effect/incapacitating/knockdown": Byond.Datum.StatusEffect.Incapacitating.Knockdown;
    "/datum/weakref": Byond.Datum.Weakref<Byond.Datum>;

    "/icon": Byond.Icon;

    "/mutable_appearance": Byond.MutableAppearance;

    "/mob": Byond.Mob;
    "/mob/dead": Byond.Mob.Dead;
    "/mob/eye": Byond.Mob.Eye;
    "/mob/living": Byond.Mob.Living;
    "/mob/living/carbon": Byond.Mob.Living.Carbon;
    "/mob/living/carbon/human": Byond.Mob.Living.Carbon.Human;

    "/obj": Byond.Obj;
    "/obj/effect/overlay": Byond.Obj.Effect.Overlay;
    "/obj/effect/overlay/closet_door": Byond.Obj.Effect.Overlay.ClosetDoor;
    "/obj/effect/particle_effect/fluid": Byond.Obj.Effect.ParticleEffect.Fluid;
    "/obj/effect/particle_effect/fluid/foam": Byond.Obj.Effect.ParticleEffect.Fluid.Foam;
    "/obj/effect/particle_effect/fluid/foam/short_life": Byond.Obj.Effect.ParticleEffect.Fluid.Foam.ShortLife;
    "/obj/item/ammo_casing/magic/hook": Byond.Obj.Item.AmmoCasing.Magic.Hook;
    "/obj/item/bodypart": Byond.Obj.Item.Bodypart;
    "/obj/item/card": Byond.Obj.Item.Card;
    "/obj/item/card/id": Byond.Obj.Item.Card.Id;
    "/obj/item/defibrillator": Byond.Obj.Item.Defibrillator;
    "/obj/item/defibrillator/compact": Byond.Obj.Item.Defibrillator.Compact;
    "/obj/item/defibrillator/compact/loaded": Byond.Obj.Item.Defibrillator.Compact.Loaded;
    "/obj/item/gun": Byond.Obj.Item.Gun;
    "/obj/item/gun/energy": Byond.Obj.Item.Gun.Energy;
    "/obj/item/gun/energy/laser": Byond.Obj.Item.Gun.Energy.Laser;
    "/obj/item/implant": Byond.Obj.Item.Implant;
    "/obj/item/implanter": Byond.Obj.Item.Implanter;
    "/obj/item/organ/zombie_infection": Byond.Obj.Item.Organ.ZombieInfection;
    "/obj/item/storage": Byond.Obj.Item.Storage;
    "/obj/item/storage/backpack": Byond.Obj.Item.Storage.Backpack;
    "/obj/item/storage/medkit": Byond.Obj.Item.Storage.Medkit;
    "/obj/item/storage/medkit/tactical_lite": Byond.Obj.Item.Storage.Medkit.TacticalLite;
    "/obj/structure": Byond.Obj.Structure;
    "/obj/structure/barricade/wooden/crude": Byond.Obj.Structure.Barricade.Wooden.Crude;
    "/obj/structure/closet": Byond.Obj.Structure.Closet;
    "/obj/structure/closet/crate": Byond.Obj.Structure.Closet.Crate;
    "/obj/structure/closet/crate/secure": Byond.Obj.Structure.Closet.Crate.Secure;
    "/obj/structure/closet/crate/secure/freezer": Byond.Obj.Structure.Closet.Crate.Secure.Freezer;
    "/obj/structure/closet/crate/secure/gear": Byond.Obj.Structure.Closet.Crate.Secure.Gear;
    "/obj/structure/geyser": Byond.Obj.Structure.Geyser;
    "/obj/structure/holopay": Byond.Obj.Structure.Holopay;
    "/obj/structure/window": Byond.Obj.Structure.Window;

    "/sound": Byond.Sound;

    "/turf": Byond.Turf;

    "/world": Byond.World;
}

/**
 * Every type path in the registry whose type is `T` or a subtype of it.
 *
 * Use this to constrain a type path parameter, instead of putting a conditional type in the parameter
 * position: a conditional that depends on the type parameter stays unresolved inside the function body,
 * so `SS13.type()` on it widens to a union of unrelated registry types.
 */
declare type PathsOf<T> = {
    [K in keyof TypePathRegistry]: TypePathRegistry[K] extends T ? K : never;
}[keyof TypePathRegistry];

declare type TypePathOf<T> = {
    [K in keyof TypePathRegistry]: TypePathRegistry[K] extends T ? (T extends TypePathRegistry[K] ? K : never) : never;
}[keyof TypePathRegistry];
