import { icon, sounds } from "../common/web-loader";

// #region Zombie sounds

export const tankFootstepSound = sounds([
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/footstep1.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/footstep2.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/footstep3.ogg",
]);

export const tankDeathSound = sounds([
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/death1.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/death2.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/death3.ogg",
]);

export const tankRoarSounds = sounds([
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/roar1.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/roar2.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/roar3.ogg",
]);

// #endregion

// #region Ability icons

export const slimeActions = icon(
    "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_slime.dmi"
);
export const itemActions = icon(
    "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_items.dmi"
);
export const cultActions = icon(
    "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_cult.dmi"
);
export const minorAntagActions = icon(
    "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_minor_antag.dmi"
);
export const targetPointer = icon(
    "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/effects/mouse_pointers/cult_target.dmi"
);

// #endregion
