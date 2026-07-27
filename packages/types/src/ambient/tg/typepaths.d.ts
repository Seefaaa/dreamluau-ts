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
