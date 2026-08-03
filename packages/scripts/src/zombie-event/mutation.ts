/** @noSelfInFile */

import * as SS13 from "SS13";
import * as HandlerGroup from "handler_group";
import { type AbilityBuilder, grantAbility } from "../common/ability";
import {
    add_trait,
    do_sparks,
    explosion,
    get_dir,
    get_step,
    has_trait,
    key_name_admin,
    message_admins,
    pick_list,
    playsound,
    ref,
    remove_trait,
    to_chat,
    turn,
} from "../common/globals";
import { getReadablePerfStat, sleepingAt, timeAvg, totalCallCount, totalTimeTaken } from "../common/perf";
import { isAdmin, pickRandom } from "../common/utils";
import { icon } from "../common/web-loader";
import { damageTypes } from "./constants";
import { controllerSay, makeZombieController } from "./controller";
import { foamSpawner } from "./fluid";
import { tankDeathSound, tankFootstepSound, tankRoarSounds } from "./sounds";
import { createHref, isZombieSpecies } from "./utils";

// #region Zombie Classes

export const zombieClasses = {
    "Non-Zombie": {
        human: true,
        abilities: [],
        onGain: (mutation: MutationData) => {
            registerClassSignal(mutation, mutation.mob, "atom_entered", (source, arrived) => {
                if (has_trait(arrived, "zs_zombie_cure")) {
                    SS13.set_timeout(0, () => {
                        const infection = source.get_organ_slot("zombie_infection");
                        if (SS13.is_valid(infection)) {
                            SS13.qdel(infection);
                            to_chat(
                                source,
                                "<span class='notice'>You feel a wave of relief and tranquility, and your mind feels clear.</span>"
                            );
                        }
                        source.set_tox_loss(0);
                        SS13.qdel(arrived); // cant inside a signal?
                    });
                }
            });
            registerClassSignal(mutation, mutation.mob, "carbon_gain_organ", (_source, organ) => {
                if (SS13.istype(organ, "/obj/item/organ/zombie_infection")) {
                    organ.organ_flags = _G.bit32.bor(organ.organ_flags, 768); // unremovable (256) | hidden (512)
                }
            });
        },
    },
    "Zombie Controller": {
        onGain: (mutation: MutationData) => {
            const mind = mutation.mob.mind;
            const controller = makeZombieController(SS13.get_turf(mutation.mob), setClass);

            if (mind) {
                mind.transfer_to(controller);
                controller.reset_perspective(controller);
            }

            SS13.qdel(mutation.mob);
            // mutation.mob = undefined;
        },
    },
    Zombie: {
        slowdown: 0.75,
        slowdownRandom: 0.5,
        damageResist: -60,
        noRevive: true,
        aiEnabled: false,
        notSpecial: true,
        traits: ["nohardcrit", "nosoftcrit"],
    },
    "Zombie (AI)": {
        slowdown: 0.75,
        slowdownRandom: 0.5,
        damageResist: -60,
        noRevive: true,
        aiEnabled: true,
        notSpecial: true,
        traits: ["nohardcrit", "nosoftcrit"],
        onGain: (mutation: MutationData) => {
            const definition = mutation.class && zombieClasses[mutation.class];
            if (definition && "aiEnabled" in definition && definition.aiEnabled) {
                // const ai = createZombieAi(mutation);
                // mutation.zombieAi = ai;
                SS13.set_timeout(0, () => {
                    mutation.mob.ghostize(true);
                });
            }

            const head = mutation.mob.get_bodypart("head");
            if (head) head.bodypart_flags = _G.bit32.bor(head.bodypart_flags, 1); // adds unremoveable (1)

            registerClassSignal(mutation, mutation.mob, "atom_entered", (source, arrived) => {
                if (has_trait(arrived, "zs_zombie_cure")) {
                    SS13.set_timeout(0, () => {
                        if (source.stat !== 4) {
                            source.death();
                        }

                        source.notify_revival("You are being unzombified!");
                        source.grab_ghost();

                        if (mutation.zombieAi) {
                            // mutation.zombieAi.stop();
                            mutation.zombieAi = undefined;
                        }

                        const infection = source.get_organ_slot("zombie_infection");

                        if (SS13.is_valid(infection)) {
                            SS13.qdel(infection);
                            to_chat(
                                source,
                                "<span class='notice'>You feel a wave of relief and tranquility, and your mind feels clear.</span>"
                            );
                        }

                        SS13.qdel(arrived); // cant inside a signal?

                        setClass(mutation, "Non-Zombie");
                    });
                }
            });
        },
        onLoss: (mutation: MutationData) => {
            if ("zombieAi" in mutation && mutation.zombieAi) {
                // mutation.zombieAi.stop();
                // mutation.zombieAi = undefined;
            }
            if (SS13.is_valid(mutation.mob)) {
                const head = mutation.mob.get_bodypart("head");
                if (head) head.bodypart_flags = _G.bit32.band(head.bodypart_flags, _G.bit32.bnot(1)); // removes unremoveable (1)
            }
        },
    },
    Boomer: {
        abilities: ["bomber_explode", "boomer_spew"],
        traits: ["nohardcrit", "nosoftcrit"],
        onGain: (mutation: MutationData) => {
            setAppearance(mutation, "boomer");

            mutation.mob.resistance_flags = 48; // unacidable (16) | acidproof (32)

            registerClassSignal(mutation, mutation.mob, "living_death", (_source, gibbed) => {
                SS13.set_timeout(0, () => {
                    const classDef = mutation.class && zombieClasses[mutation.class];
                    if (classDef && "explode" in classDef) classDef.explode(mutation, gibbed === 1, 1);
                });
            });

            registerClassSignal(mutation, mutation.mob, "atom_expose_reagents", (_source, reagents) => {
                for (const [reagent] of reagents) {
                    if (SS13.istype(reagent, "/datum/reagent/blob/networked_fibers")) {
                        return 1;
                    }
                }
            });
        },
        onLoss: (mutation: MutationData) => {
            resetAppearance(mutation);
            mutation.mob.resistance_flags = 0;
        },
        explode: (mutation: MutationData, gibbed: boolean, extraRange: number) => {
            if (!SS13.is_valid(mutation.mob)) return;

            playsound(mutation.mob, "sound/effects/splat.ogg", 100, true);

            const position = assert(mutation.mob.drop_location());
            makeHearersVulnerable(position);

            if (!gibbed) mutation.mob.gib();

            explosion(position, 0, 0, 2, 0, 5);

            const foo = SS13.new("/datum/effect_system/fluid_spread/foam/short", position, extraRange + 1);
            foo.chemholder.add_reagent(SS13.type("/datum/reagent/blob/networked_fibers"), 15);
            // foo.color = "#5050FF";
            foo.start();
        },
    },
    Jockey: {
        slowdown: -1.5,
        damage: 11,
        noRevive: true,
        abilities: ["jockey_leap"],
        traits: ["passtable", "ventcrawler_always", "nohardcrit", "nosoftcrit"],
        onGain: (mutation: MutationData) => {
            setAppearance(mutation, "jockey");
            mutation.mob.pass_flags = 1; // passtable
        },
        onLoss: (mutation: MutationData) => {
            resetAppearance(mutation);
            mutation.mob.pass_flags = 0;
        },
    },
    Smoker: {
        damage: 31,
        slowdown: 1,
        abilities: ["smoker_hook"],
        traits: ["nohardcrit", "nosoftcrit"],
        noRevive: true,
        onGain: (mutation: MutationData) => {
            setAppearance(mutation, "smoker");
        },
        onLoss: (mutation: MutationData) => {
            resetAppearance(mutation);
        },
    },
    Tank: {
        slowdown: 0,
        damage: 30,
        demolitionMod: 6,
        damageResist: 50,
        noRevive: true,
        traits: [
            "ignoredamageslowdown",
            "shock_immunity",
            "push_immunity",
            "stun_immunity",
            "baton_resistance",
            "resist_high_pressure",
            "resist_low_pressure",
            "bomb_immunity",
            "rad_immunity",
            "no_blood_overlay",
            "no_stagger",
            "noslip_all",
            "noflash",
            "nohardcrit",
            "nosoftcrit",
        ],
        abilities: ["tank_roar"],
        onGain: (mutation: MutationData) => {
            setAppearance(mutation, "tank");

            const sound = pickRandom(tankRoarSounds);
            playsound(mutation.mob, sound, 80, true, 15, 1.5, undefined, 0, true, true, 8);

            for (const [, hand] of mutation.mob.held_items) {
                if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

                registerClassSignal(mutation, hand, "item_afterattack", (_source, target, user) => {
                    if (!SS13.istype(target, "/mob/living")) return;

                    const turf = SS13.get_turf(user);
                    const dir = get_dir(user, target);

                    let targetTurf = turf;

                    for (const _ of $range(1, 8)) {
                        targetTurf = get_step(targetTurf, dir);
                    }

                    target.Knockdown(20);
                    target.throw_at(targetTurf, 8, 2);
                });

                registerClassSignal(mutation, hand, "item_interacting_with_atom", (_source, _user, interactingWith) => {
                    if (!SS13.istype(interactingWith, "/turf/closed/wall")) return;
                    mutation.mob.UnarmedAttack(interactingWith, 1);
                    return 1;
                });

                let steps = 0;
                let nextPlay = 0;

                mutation.mob._RemoveElement([SS13.type("/datum/element/footstep"), "footstep_human", 1, -6]);

                registerClassSignal(mutation, mutation.mob, "movable_moved", (_source, _old_loc, _direction) => {
                    if (mutation.mob.body_position === 1) return;

                    const worldTime = dm.world.time;

                    if (++steps < 2 || nextPlay > worldTime) return;

                    nextPlay = worldTime + 6;

                    const sound = pickRandom(tankFootstepSound);
                    playsound(mutation.mob, sound, 20, true, 15, 1.5, undefined, 0, true, true, 8);

                    steps = 0;
                });

                registerClassSignal(mutation, mutation.mob, "living_death", (_source, _gibbed) => {
                    const sound = pickRandom(tankDeathSound);
                    playsound(mutation.mob, sound, 40, true, 15, 1.5, undefined, 0, true, true, 8);
                });

                mutation.mob._AddElement([SS13.type("/datum/element/wall_tearer"), true, 80, 3]);

                mutation.mob.status_flags = 0;
            }
        },
        onLoss: (mutation: MutationData) => {
            resetAppearance(mutation);
            mutation.mob._AddElement([SS13.type("/datum/element/footstep"), "footstep_human", 1, -6]);
            mutation.mob._RemoveElement([SS13.type("/datum/element/wall_tearer"), true, 80, 3]);
            mutation.mob.status_flags = 15;
        },
    },
} as const satisfies Record<string, ZombieClass>;

export type ZombieClassName = keyof typeof zombieClasses;

export type ZombieClass = {
    traits?: string[];
    abilities?: (keyof typeof zombieAbilities)[];
    onGain?: (this: void, mutation: MutationData) => void;
    onLoss?: (this: void, mutation: MutationData) => void;
} & {
    damage?: number;
    slowdown?: number;
    slowdownRandom?: number;
    damageResist?: number;
    demolitionMod?: number;
    noRevive?: boolean;
} & {
    explode?: (mutation: MutationData, gibbed: boolean, extraRange: number) => void;
} & {
    human?: true;
    // derived?: ZombieClassName;
    aiEnabled?: boolean;
    notSpecial?: boolean;
};

// #endregion

// #region Zombie Abilities

const zombieAbilities = {
    bomber_explode: {
        name: "Detonate yourself",
        icon: "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_slime.dmi",
        icon_state: "gel_cocoon",
        abilityType: "normal",
        cooldown: 10,
        onActivate: (context) => {
            SS13.set_timeout(0, () => {
                const classDef = context.class && zombieClasses[context.class];
                if (classDef && "explode" in classDef) classDef.explode(context, false, 1);
            });
        },
    },
    boomer_spew: {
        name: "Spew bile",
        icon: "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_slime.dmi",
        icon_state: "consume",
        abilityType: "targeted",
        cooldown: 30,
        onActivate(context, _action, target) {
            if (!SS13.is_valid(context.mob) || has_trait(context.mob, "immobilized") || context.mob.body_position === 1)
                return 1;

            SS13.set_timeout(0, () => {
                playsound(context.mob, "sound/effects/splat.ogg", 100, true);

                const fluidGroup = SS13.new("/datum/fluid_group", 9);
                const spawnFoam = foamSpawner(fluidGroup, "#5050FF", "/datum/reagent/blob/networked_fibers", 30);

                const position = assert(context.mob.drop_location());
                const line = dm.global_procs.get_line(position, target);

                makeHearersVulnerable(position);
                add_trait(context.mob, "block_transformations", "zs_bile_spewing");

                let endLoop = false;
                let currentTurf: Byond.Turf | undefined;
                let previousTurf = SS13.get_turf(position);
                let currentDirection = get_dir(previousTurf, target);

                SS13.start_loop(0.1, 5, (iteration) => {
                    if (endLoop || iteration === 5) {
                        remove_trait(context.mob, "block_transformations", "zs_bile_spewing");
                    }

                    if (endLoop) return;

                    if (currentTurf) previousTurf = currentTurf;

                    if (iteration >= line.length() - 1) {
                        currentTurf = get_step(previousTurf, currentDirection);
                    } else {
                        // biome-ignore lint/style/noNonNullAssertion: boundary check is done above
                        currentTurf = line.get(iteration + 1)!;
                        currentDirection = get_dir(previousTurf, currentTurf) ?? currentDirection;
                    }

                    let canPass = false;

                    const atmosAdjacentTurfs = currentTurf.atmos_adjacent_turfs;
                    const prevAtmosAdjacentTurfs = previousTurf.atmos_adjacent_turfs;

                    // checks can air move between the two turfs, if not, it will stop the bile spew
                    if (atmosAdjacentTurfs && atmosAdjacentTurfs.get(previousTurf)) {
                        // checks if directly adjacent
                        canPass = true;
                    } else if (atmosAdjacentTurfs && prevAtmosAdjacentTurfs) {
                        // checks if any of the adjacent turfs are shared between the two turfs
                        for (const [turf] of atmosAdjacentTurfs) {
                            for (const [prevTurf] of prevAtmosAdjacentTurfs) {
                                if (ref(turf) === ref(prevTurf)) {
                                    canPass = true;
                                    break;
                                }
                            }
                            if (canPass) break;
                        }
                    }

                    if (!canPass) {
                        endLoop = true;
                        return;
                    }

                    let angle = 225;

                    // can this be done with bit32?
                    if (
                        currentDirection === 1 ||
                        currentDirection === 2 ||
                        currentDirection === 4 ||
                        currentDirection === 8
                    ) {
                        angle = 90;
                    }

                    // spawns foam with width of 3 turfs
                    spawnFoam(currentTurf);
                    spawnFoam(get_step(currentTurf, turn(currentDirection, angle)));
                    spawnFoam(get_step(currentTurf, turn(currentDirection, -angle)));
                });
            });
        },
    },

    smoker_hook: {
        name: "Entangle",
        icon: "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_cult.dmi",
        icon_state: "carve",
        abilityType: "targeted",
        cooldown: 15,
        onActivate(context, _action, target) {
            if (!SS13.is_valid(context.mob) || has_trait(context.mob, "immobilized") || context.mob.body_position === 1)
                return 1;

            SS13.set_timeout(0, () => {
                if ("meathook" in context && SS13.is_valid(context.meathook)) {
                    SS13.qdel(context.meathook);
                }

                const meathook = SS13.new("/obj/item/ammo_casing/magic/hook", context.mob);

                context.meathook = meathook;

                SS13.register_signal(meathook, "fire_casing", (_1, _2, _3, _f4, _5, _6, _7, _8, _9, thrown_proj) => {
                    if (!SS13.is_valid(thrown_proj)) return;

                    SS13.register_signal(thrown_proj, "projectile_self_on_hit", (_1, _2, target) => {
                        SS13.set_timeout(0, () => {
                            if (has_trait(target, "hooked")) return;

                            add_trait(target, "block_transformations", "zs_hooked");

                            HandlerGroup.register_once(target, "removetrait hooked", () => {
                                remove_trait(target, "block_transformations", "zs_hooked");
                            });
                        });
                    });
                });

                meathook.fire_casing(target, context.mob, undefined, undefined, undefined, "chest", 0, context.mob);

                playsound(context.mob, "sound/weapons/batonextend.ogg", 100);
            });
        },
    },

    tank_roar: {
        name: "Roar",
        icon: "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_items.dmi",
        icon_state: "berserk_mode",
        abilityType: "normal",
        cooldown: 15,
        onActivate(context) {
            const sound = pickRandom(tankRoarSounds);
            playsound(context.mob, sound, 100);

            SS13.set_timeout(0, () => {
                context.mob.emote("me", 1, "roars!", true);
            });
        },
    },

    jockey_leap: {
        name: "Leap",
        icon: "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_items.dmi",
        icon_state: "jetboot",
        abilityType: "targeted",
        cooldown: 15,
        onActivate(context, _action, target) {
            if ("riding" in context && context.riding && SS13.is_valid(context.riding)) return 1;

            SS13.set_timeout(0, () => {
                if (!SS13.is_valid(context.mob)) return 1;

                playsound(context.mob, "sound/weapons/fwoosh.ogg", 100, true);

                HandlerGroup.register_once(context.mob, "movable_pre_impact", (zombie, victim) => {
                    if (
                        !SS13.istype(victim, "/mob/living/carbon/human") ||
                        has_trait(victim, "zs_being_ridden") ||
                        isZombieSpecies(victim) ||
                        victim.body_position === 1
                    )
                        return 0;

                    zombie.remote_control = victim;
                    zombie.pixel_z = 12;
                    zombie.layer = 4.1;
                    zombie.forceMove(assert(victim.loc));

                    victim.add_traits(["block_transformations", "zs_being_ridden", "sleep_immunity"], "zombie_riding");
                    victim.mobility_flags = _G.bit32.band(victim.mobility_flags, _G.bit32.bnot(384)); // rest (128) | liedown (256)
                    victim.emote("scream");

                    context.riding = victim;

                    let cancel: () => void;

                    const group = HandlerGroup.new();
                    const timer = SS13.start_loop(5, -1, () => victim.emote("scream"));
                    const action = grantAbility(zombie, undefined, {
                        name: "Dismount",
                        icon: "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_minor_antag.dmi",
                        icon_state: "infect",
                        abilityType: "normal",
                        cooldown: 0,
                        onActivate() {
                            cancel();
                        },
                    });

                    cancel = () => {
                        zombie.remote_control = undefined;
                        zombie.pixel_z = 0;
                        zombie.layer = 4;

                        victim.remove_traits(
                            ["block_transformations", "zs_being_ridden", "sleep_immunity"],
                            "zombie_riding"
                        );
                        victim.mobility_flags = _G.bit32.bor(victim.mobility_flags, 384); // rest (128) | liedown (256)

                        context.riding = undefined;

                        group.clear();
                        SS13.end_loop(timer);
                        SS13.qdel(action);
                    };

                    // on deleted
                    group.register_signal(zombie, "parent_qdeleting", () => cancel());
                    group.register_signal(victim, "parent_qdeleting", () => cancel());

                    // on died
                    group.register_signal(victim, "mob_statchange", (_source, new_stat) => {
                        if (new_stat !== 0) cancel();
                    });
                    group.register_signal(zombie, "mob_statchange", (_source, new_stat) => {
                        if (new_stat !== 0) cancel();
                    });

                    // on floored
                    group.register_signal(zombie, "addtrait floored", () => cancel());
                    group.register_signal(victim, "addtrait floored", () => cancel());

                    // follow
                    group.register_signal(victim, "movable_moved", (_source, _old_loc, direction) => {
                        if (!SS13.is_valid(zombie.remote_control) || ref(zombie.remote_control) !== ref(victim)) {
                            cancel();
                            return 0;
                        }

                        const loc = victim.loc;
                        if (loc) zombie.forceMove(loc);
                        if (direction !== 0) zombie.setDir(direction);
                    });

                    let nextRelay = 0;

                    group.register_signal(victim, "atom_relaymove", (_source, user, direction) => {
                        if (ref(user) !== ref(zombie)) return 0;

                        if (dm.world.time < nextRelay) return 1;

                        victim.Move(get_step(user, direction));
                        nextRelay = dm.world.time + 10; // 1 second cd

                        return 1;
                    });

                    return 0;
                });

                context.mob.throw_at(target, 5, 3, context.mob, false, false, undefined, 2_000, true);

                SS13.set_timeout(5, () => {
                    if (SS13.is_valid(context.mob)) {
                        SS13.unregister_signal(context.mob, "movable_pre_impact");
                    }
                });
            });
        },
    },
} as const satisfies Record<string, AbilityBuilder<MutationData>>;

// #endregion

export type MutationData = {
    mob: Byond.Mob.Living.Carbon.Human;
    class?: ZombieClassName;

    zombieAi?: {
        nextTargetSearch: number;
        lastTarget: number;
        makeActive: (this: NonNullable<MutationData["zombieAi"]>) => void;
    };

    // spawned by a geyser or an admin
    spawned?: boolean;

    // ability data
    meathook?: Byond.Obj.Item.AmmoCasing.Magic.Hook;
    riding?: Byond.Atom.Movable;

    // transformation data
    cleanup: (
        | { target: Byond.Datum; signal: keyof SignalRegistry; callback: (...args: any[]) => any }
        | ((...args: any[]) => void)
    )[];
    oldSpecies?: Byond.Type<Byond.Datum.Species>;
    oldVoice?: string;
    antagDatum?: Byond.Datum.Antagonist;
    overlay?: Byond.MutableAppearance; // overlay for the zombie class (tank), if any
};

function makeHearersVulnerable(position: Byond.Atom) {
    const hearers = dm.global_procs.get_hearers_in_range(6, position);
    if (!hearers) return;

    const group = HandlerGroup.new();

    for (const [, hearer] of list.filter(hearers, "/mob/living/carbon/human")) {
        group.register_signal(hearer, "atom_expose_reagents", (_source, reagents) => {
            for (const [reagent] of reagents) {
                if (SS13.istype(reagent, "/datum/reagent/blob/networked_fibers")) {
                    infectTarget(hearer);
                    break;
                }
            }
            return 0;
        });
    }

    SS13.set_timeout(5, () => {
        group.clear();
    });
}

/**
 * Inserts a zombie infection organ into the specified human mob if they do not already have one.
 *
 * @param human The human mob to infect with a zombie infection organ.
 */
function infectTarget(human: Byond.Mob.Living.Carbon.Human) {
    if (SS13.is_valid(human.get_organ_slot("zombie_infection"))) {
        return;
    }

    const infection = SS13.new("/obj/item/organ/zombie_infection");
    infection.Insert(human);
}

// didnt check
export function setClass(mutation: MutationData, newClass: keyof typeof zombieClasses | undefined) {
    if (mutation.class === newClass) return;

    // #region Revert previous effects

    const previousClass = mutation.class && zombieClasses[mutation.class];

    if (previousClass && "onLoss" in previousClass) previousClass.onLoss(mutation);

    // run cleanup callbacks
    for (const registered of mutation.cleanup) {
        if (typeof registered === "function") registered();
        else SS13.unregister_signal(registered.target, registered.signal, registered.callback);
    }
    mutation.cleanup = [];

    // remove traits
    if (previousClass && "traits" in previousClass && previousClass.traits.length > 0) {
        mutation.mob.remove_traits(previousClass.traits, "zs_class");
    }

    mutation.class = undefined;

    // remove movespeed modifier
    mutation.mob.remove_movespeed_modifier(SS13.type("/datum/movespeed_modifier/admin_varedit"));

    SS13.unregister_signal(mutation.mob, "mob_ability_base_started");

    for (const [, item] of mutation.mob.held_items) {
        if (SS13.istype(item, "/obj/item/mutant_hand/zombie")) {
            item.force = 21;
        }
    }

    if (previousClass && "damageResist" in previousClass) {
        const physiology = mutation.mob.physiology;
        for (const damageType of damageTypes) {
            const current = physiology[damageType];

            if (damageType === "siemens_coeff") {
                physiology[damageType] = current + 0.8;
            } else {
                physiology[damageType] = current + 0.01 * previousClass.damageResist;
            }
        }
    }

    // #endregion

    if (newClass === undefined) return;

    // #region Apply new effects

    const nextClass = zombieClasses[newClass];

    const grantedAbilities: Byond.Datum.Action.Cooldown[] = [];

    if ("abilities" in nextClass) {
        for (const ability of nextClass.abilities) {
            table.insert(grantedAbilities, grantAbility(mutation.mob, mutation, zombieAbilities[ability]));
        }
    }

    table.insert(mutation.cleanup, () => {
        for (const ability of grantedAbilities) {
            SS13.qdel(ability);
        }
    });

    mutation.class = newClass;

    if ("slowdown" in nextClass) {
        let slowdown = nextClass.slowdown;

        if ("slowdownRandom" in nextClass) {
            let adjusted = math.floor(math.random() * nextClass.slowdownRandom * 1_000) / 1_000;
            if (math.random(0, 1) === 1) adjusted *= -1;
            slowdown += adjusted;
        }

        mutation.mob.add_or_update_variable_movespeed_modifier(
            SS13.type("/datum/movespeed_modifier/admin_varedit"),
            true,
            slowdown
        );
    }

    if (isZombieSpecies(mutation.mob)) {
        if ("human" in nextClass) {
            if (mutation.oldSpecies) {
                mutation.mob.set_species(mutation.oldSpecies);
            } else {
                mutation.mob.set_species(SS13.type("/datum/species/human"));
            }

            mutation.mob.voice = mutation.oldVoice;

            if (mutation.antagDatum) {
                mutation.antagDatum.on_removal();
                SS13.qdel(mutation.antagDatum);
                mutation.antagDatum = undefined;
            }
        }
    } else {
        if (!("human" in nextClass)) {
            mutation.mob.set_species(SS13.type("/datum/species/zombie/infectious"));
            mutation.oldVoice = mutation.mob.voice;
            mutation.mob.voice = "Man (Big)";
        }
    }

    if (!mutation.antagDatum && !(mutation.spawned || newClass !== "Zombie (AI)") && !("human" in nextClass)) {
        mutation.mob.mind_initialize();

        const antag = SS13.new("/datum/antagonist/custom");
        antag.show_in_roundend = false;
        antag.show_to_ghosts = true;
        antag.ui_name = undefined;

        const mind = assert(mutation.mob.mind);

        const objective = SS13.new("/datum/objective");
        objective.owner = mind;
        objective.explanation_text = "Seek out the humans, kill the humans.";
        objective.completed = true;

        list.add(antag.objectives, objective);

        mutation.antagDatum = antag;

        mind.add_antag_datum(antag);
    }

    if (mutation.antagDatum) {
        mutation.antagDatum.name = newClass;
        mutation.antagDatum.antagpanel_category = "notSpecial" in nextClass ? "Infected" : "Special Infected";
    }

    const demolitionMod = "demolitionMod" in nextClass ? nextClass.demolitionMod : 2;

    if (isZombieSpecies(mutation.mob)) {
        for (const [, hand] of mutation.mob.held_items) {
            if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

            if ("damage" in nextClass) hand.force = nextClass.damage;
            hand.demolition_mod = demolitionMod;

            SS13.unregister_signal(hand, "item_pre_attack");

            SS13.register_signal(hand, "item_pre_attack", (_source, target) => {
                if (!SS13.istype(target, "/obj/structure")) return;

                const targetTurf = SS13.get_turf(target);

                let hasBarricade = false;
                let hasWindow = false;

                for (const [, obj] of targetTurf.contents) {
                    if (hasBarricade && hasWindow) break;
                    if (SS13.istype(obj, "/obj/structure/barricade/wooden/crude")) hasBarricade = true;
                    else if (SS13.istype(obj, "/obj/structure/window")) hasWindow = true;
                }

                if (SS13.istype(target, "/obj/structure/barricade/wooden/crude") && hasWindow)
                    hand.demolition_mod = 0.1;
                else if (!hasBarricade) {
                    if (SS13.istype(target, "/obj/structure/window/reinforced/plasma/plastitanium"))
                        hand.demolition_mod = 35;
                    else if (SS13.istype(target, "/obj/structure/window/reinforced/plasma")) hand.demolition_mod = 10;
                    else if (SS13.istype(target, "/obj/structure/window/reinforced")) hand.demolition_mod = 5;
                    else if (SS13.istype(target, "/obj/structure/window/plasma")) hand.demolition_mod = 5;
                } else if (hasBarricade && hasWindow) hand.demolition_mod = demolitionMod * 0.25;

                SS13.set_timeout(0, () => {
                    hand.demolition_mod = demolitionMod;
                });
            });
        }

        const infection = mutation.mob.get_organ_slot("zombie_infection");

        if (SS13.is_valid(infection)) {
            if ("noRevive" in nextClass) {
                if (infection.old_species) {
                    mutation.oldSpecies = infection.old_species;
                }
                infection.old_species = undefined;
            } else {
                infection.UnregisterSignal(mutation.mob, "living_death");
            }
        }

        mutation.mob.remove_traits(["nodeath"], "species");
    }

    if ("traits" in nextClass) {
        mutation.mob.add_traits(nextClass.traits, "zs_class");
    }

    if ("damageResist" in nextClass) {
        const physiology = mutation.mob.physiology;
        for (const damageType of damageTypes) {
            const current = physiology[damageType];

            if (damageType === "siemens_coeff") {
                physiology[damageType] = current - 0.8;
            } else {
                physiology[damageType] = current - 0.01 * nextClass.damageResist;
            }
        }
    }

    if ("onGain" in nextClass) nextClass.onGain(mutation);

    // #endregion
}

// #region Helpers

function registerClassSignal<T extends Byond.Datum, S extends keyof SignalRegistry<T>>(
    humanData: MutationData,
    target: T,
    signal: S,
    callback: SignalRegistry<T>[S]
) {
    SS13.register_signal(target, signal, callback);
    table.insert(humanData.cleanup, { target, signal, callback });
}

const appearanceCache: Record<string, Byond.MutableAppearance> = {};

function setAppearance(mutation: MutationData, state: string) {
    let appearance = appearanceCache[state];

    if (!appearance) {
        appearance = SS13.new("/mutable_appearance");
        appearance.icon = icon(
            "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/zombie.dmi"
        );
        appearance.icon_state = state;
        appearance.appearance_flags = 837;
        appearanceCache[state] = appearance;
    }

    mutation.mob.alpha = 0;
    mutation.mob.add_overlay(appearance);
    mutation.overlay = appearance;
}

function resetAppearance(mutation: MutationData) {
    if (mutation.overlay) {
        mutation.mob.alpha = 255;
        mutation.mob.cut_overlay(mutation.overlay);
    }
}

// #endregion

// #region Cure Injector

/**
 * Creates a cure injector at the specified location. The injector contains
 * a implant that can be used to cure zombie infection.
 * @param location The location where the cure injector will be created.
 * @returns The created cure injector object.
 */
export function createCureInjector(location: Byond.Atom) {
    const implanter = SS13.new("/obj/item/implanter", location);
    implanter.name = "biocure injector";
    implanter.desc =
        "An injector containing a strange serum. There's a label on the side that reads <span class='notice'>'Biocure'</span>";

    const implant = SS13.new("/obj/item/implant", implanter);
    implant.name = "biocure";
    implant.allow_multiple = true;
    implant.add_traits(["zs_zombie_cure"], "innate");

    implanter.imp = implant;
    implanter.update_appearance();

    return implanter;
}

// #endregion

// #region Zombie Mutation Setup

/**
 * Sets up the zombie mutation for a given human mob. It initializes the mutation data, registers
 * necessary signals,and sets the initial class based on the human's species.
 *
 * @param human The human mob for which the zombie mutation is being set up.
 * @returns The initialized mutation data for the human mob.
 */
export function setupZombieMutation(human: Byond.Mob.Living.Carbon.Human): MutationData {
    const humanRef = ref(human);

    const existingMutation = allMutations[humanRef];
    if (existingMutation) setClass(existingMutation, undefined);

    const mutation: MutationData = {
        mob: human,
        class: "Non-Zombie",
        cleanup: [],
    };

    if (isLocal && human.ckey === runner) {
        setClass(mutation, localClass);
    } else {
        if (isZombieSpecies(human)) setClass(mutation, "Zombie");
        else setClass(mutation, "Non-Zombie");
    }

    allMutations[humanRef] = mutation;

    SS13.unregister_signal(human, "atom_examine");
    SS13.unregister_signal(human, "species_gain");
    SS13.unregister_signal(human, "species_loss");
    SS13.unregister_signal(human, "parent_preqdeleted");
    SS13.unregister_signal(human, "handle_topic");

    SS13.register_signal(human, "atom_examine", (_source, examiner, examination) => {
        const admin = isAdmin(examiner);

        if (admin || SS13.istype(examiner, "/mob/dead")) {
            list.add(examination, `<hr/><span class='notice'>Zombie Class: ${mutation.class}</span>`);

            const infection = human.get_organ_slot("zombie_infection");
            const status = SS13.is_valid(infection) ? "<span class='danger'>Infected</span>" : "Not infected";

            list.add(examination, `<span class='notice'>Infection Status: ${status}</span>`);

            if (admin) {
                list.add(examination, `<span class='notice'>${createHref(human, "set_class=1", "Set class")}</span>`);
                list.add(
                    examination,
                    `<span class='notice'>${createHref(human, "settings=1", "Open settings menu")}</span>`
                );
            }

            list.add(examination, "<hr/>");
        }
    });

    SS13.register_signal(human, "species_gain", (_source, species) => {
        if (SS13.istype(species, "/datum/species/zombie/infectious") && mutation.class === "Non-Zombie") {
            if (!allowZombieControllable) {
                setClass(mutation, "Zombie (AI)");
                return;
            }

            setClass(mutation, "Zombie");

            SS13.set_timeout(0.5, () => {
                const [input] = SS13.await(
                    SS13.global_proc,
                    "tgui_alert",
                    mutation.mob,
                    "You're a zombie now! Do you want to let the computer take control? You'll be allowed to re-enter your body once you are cured.",
                    "Zombie Control",
                    ["No", "Yes"]
                );

                if (input === "Yes") {
                    setClass(mutation, "Zombie (AI)");
                }
            });
        }
    });

    // setClass without set_timeout 0 might cause problems if setClass is sleeping
    SS13.register_signal(human, "species_loss", (_source, species) => {
        if (SS13.istype(species, "/datum/species/zombie/infectious")) {
            setClass(mutation, "Non-Zombie");
        }
    });

    // this is problematic
    SS13.register_signal(human, "parent_preqdeleted", () => {
        setClass(mutation, undefined);
        // @ts-expect-error assiging undefined deletes in lua
        allMutations[humanRef] = undefined;
    });

    SS13.register_signal(human, "handle_topic", (_source, user, hrefList) => {
        if (!isAdmin(user)) return;

        SS13.set_timeout(0, () => {
            let refresh = false;

            if ("set_spawning" in hrefList) {
                isSpawning = hrefList.get("set_spawning") === "1";
                refresh = true;
            } else if ("set_tank_spawn" in hrefList) {
                allowTankSpawn = hrefList.get("set_tank_spawn") === "1";
                refresh = true;
            } else if ("set_zombie_control" in hrefList) {
                allowZombieControllable = hrefList.get("set_zombie_control") === "1";
                refresh = true;
            } else if ("spawn_supply_crate" in hrefList) {
                const pod = dm.global_procs.podspawn({
                    target: SS13.get_turf(user),
                    style: SS13.type("/datum/pod_style/centcom"),
                });

                const crate = SS13.new("/obj/structure/closet/crate/secure/gear", pod);
                crate.name = "secure supply crate";

                if ("timed" in hrefList) {
                    crate.anchored = true;
                    crate.set_access(["admin"]);

                    crate.say("Disengaging secure locks in 30 seconds");

                    SS13.start_loop(10, 3, (iteration) => {
                        if (!SS13.is_valid(crate)) return;

                        if (iteration === 3) {
                            crate.bust_open();
                            crate.say("Secure locks disengaged.");
                        } else {
                            crate.say(`Disengaging secure locks in ${30 - iteration * 10} seconds`);
                        }
                    });
                }

                for (const _ of $range(1, 4)) SS13.new("/obj/item/gun/energy/laser", crate);
                for (const _ of $range(1, 3)) SS13.new("/obj/item/storage/medkit/tactical_lite", crate);
                for (const _ of $range(1, 2)) SS13.new("/obj/item/defibrillator/compact/loaded", crate);
            } else if ("spawn_cure" in hrefList) {
                const crate = SS13.new("/obj/structure/closet/crate/secure/freezer", SS13.get_turf(user));
                crate.name = "secure biocrate";
                crate.base_icon_state = "freezer";
                crate.icon_state = "freezer";

                for (const _ of $range(1, 5)) createCureInjector(crate);
            } else if ("spawn_cure_spawner" in hrefList) {
                const crate = SS13.new("/obj/structure/closet/crate/secure/freezer", SS13.get_turf(user));
                crate.name = "biocure generator";
                crate.base_icon_state = "freezer";
                crate.icon_state = "freezer";
                crate.anchored = true;

                const loop = SS13.start_loop(5, -1, () => {
                    if (!SS13.is_valid(crate)) {
                        SS13.end_loop(loop);
                        return;
                    }

                    const hitLimit = (location: Byond.Atom) => {
                        let count = 0;
                        for (const [, obj] of list.filter(location.contents, "/obj/item/implanter")) {
                            if (SS13.is_valid(obj.imp) && has_trait(obj.imp, "zs_zombie_cure")) count += 1;
                        }
                        return count >= 5;
                    };

                    if (crate.opened === 1) {
                        const location = crate.loc;
                        if (location && !hitLimit(location)) {
                            createCureInjector(location);
                            do_sparks(
                                2,
                                true,
                                crate,
                                crate,
                                SS13.type("/datum/effect_system/basic/spark_spread/quantum")
                            );
                        }
                    } else if (!hitLimit(crate)) createCureInjector(crate);
                });

                SS13.register_signal(crate, "parent_qdeleting", () => {
                    SS13.end_loop(loop);
                });
            } else if ("spawn_zombie_ai" in hrefList) {
                const zombie = SS13.new("/mob/living/carbon/human", SS13.get_turf(user));

                zombie.equipOutfit(SS13.type("/datum/outfit/job/assistant"));

                const mutation = setupZombieMutation(zombie);
                mutation.spawned = true;

                setClass(mutation, "Zombie (AI)");
            } else if ("spawn_zombie_spawner" in hrefList) {
                let zombies = 0;

                const spawner = SS13.new("/obj/structure/geyser", SS13.get_turf(user));
                spawner.name = "zombie spawner";
                spawner.color = "#008000";
                spawner.anchored = true;
                spawner.layer = 4.1;
                spawner.pixel_y = -4;

                if (!destructibleSpawners) {
                    // lavaproof (1) | fireproof (2) | unacidable (16) | acidproof (32)
                    // indestructible (64) | freezeproof (128) | shuttlecrushproof (256)
                    spawner.resistance_flags = 499;
                }

                const spawn = (force: boolean, special: boolean) => {
                    if (!isSpawning && !force) return;
                    if (!SS13.is_valid(spawner)) return;
                    if (zombies >= 5 && !force) return;

                    const location = SS13.get_turf(spawner);
                    let className: ZombieClassName = "Zombie (AI)";

                    let mind: Byond.Datum.Mind | undefined;

                    if (math.random(1, 10) === 1 || special) {
                        className = pick_list(["Boomer", "Jockey", "Smoker"]);

                        const [candidates] = SS13.await(
                            dm.global_vars.SSpolling,
                            "poll_ghost_candidates",
                            `The mode is looking for volunteers to become a ${className}.`,
                            undefined,
                            undefined,
                            100,
                            undefined,
                            undefined,
                            spawner,
                            spawner,
                            className
                        );

                        if (!SS13.is_valid(spawner)) return;

                        let chosen: Byond.Mob | undefined;

                        if (candidates === undefined) {
                        } else if (SS13.istype(candidates, "/mob")) chosen = candidates;
                        else chosen = pick_list(candidates);

                        if (!SS13.is_valid(chosen)) {
                            message_admins(`Not enough players volunteered for the ${className} role.`);
                            return;
                        }

                        message_admins(`Selected ${key_name_admin(chosen)} for the role of ${className}.`);

                        mind = SS13.new("/datum/mind", chosen.key);
                    }

                    const zombie = SS13.new("/mob/living/carbon/human", location);
                    zombie.anchored = true;

                    zombie.equipOutfit(SS13.type("/datum/outfit/job/assistant"));

                    add_trait(zombie, "block_transformations", "zs_spawner");

                    const mutation = setupZombieMutation(zombie);
                    mutation.spawned = true;

                    setClass(mutation, className);

                    zombies += 1;

                    if (mind) mind.transfer_to(zombie, true);

                    SS13.set_timeout(1, () => {
                        if (!SS13.is_valid(zombie)) return;

                        zombie.anchored = false;

                        remove_trait(zombie, "block_transformations", "zs_spawner");

                        const group = HandlerGroup.new();

                        group.register_signal(zombie, "living_death", () => {
                            zombies -= 1;
                            group.clear();
                        });

                        group.register_signal(zombie, "parent_qdeleting", () => {
                            zombies -= 1;
                            group.clear();
                        });
                    });
                };

                const loop = SS13.start_loop(60, -1, () => spawn(false, false));

                SS13.register_signal(spawner, "parent_qdeleting", () => {
                    SS13.end_loop(loop);
                });

                SS13.register_signal(spawner, "atom_examine", (_source, examiner, examination) => {
                    if (isAdmin(examiner)) {
                        list.add(
                            examination,
                            `<span class='notice'>${createHref(spawner, "spawn=1", "Spawn zombie")}</span>`
                        );
                        list.add(
                            examination,
                            `<span class='notice'>${createHref(spawner, "spawn_special=1", "Spawn special")}</span>`
                        );
                    }
                });

                SS13.register_signal(spawner, "handle_topic", (_source, user, hrefList) => {
                    if (!isAdmin(user)) return;

                    SS13.set_timeout(0, () => {
                        if ("spawn" in hrefList) spawn(true, false);
                        else if ("spawn_special" in hrefList) spawn(true, true);
                    });
                });
            } else if ("message_controllers" in hrefList) {
                const [message] = SS13.await(
                    SS13.global_proc,
                    "tgui_input_text",
                    user,
                    "Send message to controllers",
                    "Message controllers"
                );
                if (!message) return;

                controllerSay(user, message, true, "Controller Overseer");
            } else if ("set_class" in hrefList) {
                const classList: string[] = [];

                for (const className in zombieClasses) {
                    table.insert(classList, className);
                }

                if (classList.length === 0) return;

                const [choice] = SS13.await(
                    SS13.global_proc,
                    "tgui_input_list",
                    user,
                    "Set class",
                    "Set class",
                    classList
                );

                if (!choice || !(choice in zombieClasses)) return;
                if (!SS13.is_valid(user) || !SS13.is_valid(human)) return;

                setClass(mutation, choice as ZombieClassName);
            }

            if (refresh || "settings" in hrefList || "refresh" in hrefList) {
                openZombieSettings(user, mutation);
            }
        });
    });

    return mutation;
}

// #endregion

// #region Zombie Settings Menu

/**
 * Shows the zombie settings menu to the specified user. The menu displays various options for managing
 * zombie-related settings, sending messages to controllers, spawning cure crates, and toggling zombie spawning settings.
 *
 * @param user The user who will see the zombie settings menu.
 * @param mutation Mutation data of any mob, only used to send hrefs, has nothing to do with the data itself.
 */
function openZombieSettings(user: Byond.Mob, mutation: MutationData) {
    const browser = SS13.new("/datum/browser", user, "SettingsMenu", "Settings Menu", 300, 400);

    let content = `<h1>Settings Menu</h1></hr>`;

    content += label("Refresh", createHref(mutation.mob, "refresh=1", "Refresh"));
    content += label("Message", createHref(mutation.mob, "message_controllers=1", "Message all zombie controllers"));
    content += label("Cure", createHref(mutation.mob, "spawn_cure=1", "Spawn cure crate"));
    content += label("Cure Spawner", createHref(mutation.mob, "spawn_cure_spawner=1", "Spawn cure spawner"));
    content += label("Zombie AI", createHref(mutation.mob, "spawn_zombie_ai=1", "Spawn zombie AI"));
    content += label("Zombie Spawner", createHref(mutation.mob, "spawn_zombie_spawner=1", "Spawn zombie spawner"));
    content += label("Supplies", createHref(mutation.mob, "spawn_supply_crate=1", "Spawn supply crate"));
    content += label("Supplies", createHref(mutation.mob, "spawn_supply_crate=1&timed=1", "Spawn timed supply crate"));

    content += label(
        "Zombies Spawning",
        createHref(mutation.mob, `set_spawning=${isSpawning ? "0" : "1"}`, isSpawning ? "Enabled" : "Disabled")
    );
    content += label(
        "Allow Tank Spawning",
        createHref(
            mutation.mob,
            `set_tank_spawn=${allowTankSpawn ? "0" : "1"}`,
            allowTankSpawn ? "Enabled" : "Disabled"
        )
    );
    content += label(
        "Allow Zombie Control",
        createHref(
            mutation.mob,
            `set_zombie_control=${allowZombieControllable ? "0" : "1"}`,
            allowZombieControllable ? "Enabled" : "Disabled"
        )
    );

    content += `<hr/><b>TOTAL ZOMBIE AI: ${totalZombieAi}</b><br>`;

    const timeAvgKeys: number[] = [];
    let prevLine: number | undefined;

    for (const [key] of pairs(timeAvg)) {
        table.insert(timeAvgKeys, key);
    }

    table.sort(timeAvgKeys);

    for (const line of timeAvgKeys) {
        const avg = timeAvg[line] ?? 0;
        const total = totalTimeTaken[line] ?? 0;
        const count = totalCallCount[line] ?? 0;

        if (!prevLine) {
            prevLine = line;
            continue;
        }

        const isSleeping = sleepingAt[line];
        const status = isSleeping ? "S" : " ";

        content += `${prevLine}-${line} [${status}]: ${getReadablePerfStat(avg)} | ${getReadablePerfStat(total)} | ${count}<br>`;

        prevLine = line;
    }

    browser.set_content(content);
    browser.open();
}

const label = (label: string, content: string): string =>
    `<div style='display: flex; margin-top: 4px;'><div style='flex-grow: 1; color: #98B0C3;'>${label}:</div><div>${content}</div></div>`;

const totalZombieAi = 0;

// #endregion
