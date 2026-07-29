/** @noSelfInFile */

import * as SS13 from "SS13";
import * as HandlerGroup from "handler_group";
import { type AbilityBuilder, grantAbility } from "../common/ability";
import {
    add_trait,
    get_dir,
    get_step,
    has_trait,
    playsound,
    prob,
    ref,
    remove_trait,
    to_chat,
    turn,
} from "../common/globals";
import { damageTypes } from "./constants";
import { makeZombieController } from "./controller";
import { foamSpawner } from "./fluid";
import { tankRoarSounds } from "./sounds";
import { isZombieSpecies } from "./utils";

// #region Zombie Classes

export const zombieClasses = {
    "Non-Zombie": {
        human: true,
        abilities: [],
        onGain: (mutation: MutationData) => {
            registerClassSignal(mutation, "atom_entered", (source, arrived) => {
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
                    });
                }
            });
            registerClassSignal(mutation, "carbon_gain_organ", (_source, organ) => {
                if (SS13.istype(organ, "/obj/item/organ/zombie_infection")) {
                    organ.organ_flags = _G.bit32.bor(organ.organ_flags, 768); // unremovable (256) | hidden (512)
                }
            });
        },
    },
    "Zombie Controller": {
        onGain: (mutation: MutationData) => {
            if (!mutation.mob) return;

            const mind = mutation.mob.mind;
            const controller = makeZombieController(SS13.get_turf(mutation.mob));

            if (mind) {
                mind.transfer_to(controller);
                controller.reset_perspective(controller);
            }

            SS13.qdel(mutation.mob);
            mutation.mob = undefined;
        },
    },
    Zombie: {
        derived: "Zombie (AI)",
        aiEnabled: false,
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
            if (mutation.class && "aiEnabled" in zombieClasses[mutation.class]) {
                const ai = createZombieAi(mutation);
                mutation.zombieAi = ai;
                SS13.set_timeout(0, () => {
                    mutation.mob.ghostize(true);
                });
            }
            list.remove(dm.global_vars.GLOB.mob_living_list, mutation.mob);
        },
        onLoss: (mutation: MutationData) => {},
    },
    Boomer: {
        abilities: ["bomber_explode", "boomer_spew"],
        traits: ["nohardcrit", "nosoftcrit"],
        explode: (mutation: MutationData, gibbed: boolean, extraRange: number) => {},
        onGain: () => {},
        onLoss: (mutation: MutationData) => {},
    },
    Smoker: {
        damage: 31,
        slowdown: 1,
        abilities: ["smoker_hook"],
        traits: ["nohardcrit", "nosoftcrit"],
        noRevive: true,
        onGain: (mutation: MutationData) => {
            // setIcon(mutation, "smoker");
        },
        onLoss: (mutation: MutationData) => {
            // resetIcon(mutation);
        },
    },
    Tank: {
        demolitionMod: 6,
    },
    Jockey: {},
} as const;

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
            // biome-ignore lint/style/noNonNullAssertion: random is in bounds
            const sound = tankRoarSounds[math.random(tankRoarSounds.length)]!;
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
        onActivate(context, _action) {
            if ("riding" in context && SS13.is_valid(context.riding)) return 1;
            SS13.set_timeout(0, () => {
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
            });
        },
    },
} as const satisfies Record<string, AbilityBuilder<MutationData>>;

// #endregion

export type MutationData = {
    mob: Byond.Mob.Living.Carbon.Human;
    class?: keyof typeof zombieClasses;

    zombieAi?: {
        nextTargetSearch: number;
        lastTarget: number;
        makeActive: (this: NonNullable<MutationData["zombieAi"]>) => void;
    };
    spawned?: boolean;

    // ability data
    meathook?: Byond.Obj.Item.AmmoCasing.Magic.Hook;
    riding?: Byond.Atom.Movable;

    // transformation data
    cleanup: (MutationSignalHandler | ((...args: any[]) => void))[];
    oldSpecies?: Byond.Type<Byond.Datum.Species>;
    oldVoice?: string;
    antagDatum?: Byond.Datum.Antagonist;
};

type MutationSignalHandler<
    D extends Byond.Datum = Byond.Mob.Living.Carbon.Human,
    S extends keyof SignalRegistry<D> = keyof SignalRegistry<D>,
> = {
    target: D;
    signal: S;
    callback: SignalRegistry<D>[S];
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

function infectTarget(human: Byond.Mob.Living.Carbon.Human, defType?: string) {
    if (SS13.is_valid(human.get_organ_slot("zombie_infection"))) {
        return;
    }

    if (defType !== "bypass") {
        const armor = human.getarmor(defType, "bio");
        if (prob(armor)) return;
    }

    const infection = SS13.new("/obj/item/organ/zombie_infection");
    infection.Insert(human);
}

// didnt check
export function setClass(mutation: MutationData, newClass: keyof typeof zombieClasses | undefined) {
    if (mutation.class === newClass) return;

    // #region Revert previous effects

    const previous = mutation.class && zombieClasses[mutation.class];

    if (previous && "onLoss" in previous) previous.onLoss(mutation);

    // run cleanup callbacks
    for (const registered of mutation.cleanup) {
        if (typeof registered === "function") registered();
        else SS13.unregister_signal(registered.target, registered.signal, registered.callback);
    }
    mutation.cleanup = [];

    // remove traits
    if (previous && "traits" in previous && previous.traits.length > 0) {
        mutation.mob.remove_traits(previous.traits, "zs_class");
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

    if (previous && "damageResist" in previous) {
        const physiology = mutation.mob.physiology;
        for (const damageType of damageTypes) {
            const current = physiology[damageType];

            if (damageType === "siemens_coeff") {
                physiology[damageType] = current + 0.8;
            } else {
                physiology[damageType] = current + 0.01 * previous.damageResist;
            }
        }
    }

    // #endregion

    if (newClass === undefined) return;

    // #region Apply new effects

    const next = zombieClasses[newClass];

    const granted: Byond.Datum.Action.Cooldown[] = [];

    if ("abilities" in next) {
        for (const ability of next.abilities) {
            table.insert(granted, grantAbility(mutation.mob, mutation, zombieAbilities[ability]));
        }
    }

    table.insert(mutation.cleanup, () => {
        for (const ability of granted) {
            SS13.qdel(ability);
        }
    });

    mutation.class = newClass;

    if ("slowdown" in next) {
        let slowdown = next.slowdown;

        if ("slowdownRandom" in next) {
            let adjusted = math.floor(math.random() * next.slowdownRandom * 1_000) / 1_000;
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
        if ("human" in next) {
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
        if (!("human" in next)) {
            mutation.mob.set_species(SS13.type("/datum/species/zombie/infectious"));
            mutation.oldVoice = mutation.mob.voice;
            mutation.mob.voice = "Man (Big)";
        }
    }

    if (!mutation.antagDatum && !(mutation.spawned || newClass !== "Zombie (AI)") && !("human" in next)) {
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
        mutation.antagDatum.antagpanel_category = "notSpecial" in next ? "Infected" : "Special Infected";
    }

    const demolitionMod = "demolitionMod" in next ? next.demolitionMod : 2;

    if (isZombieSpecies(mutation.mob)) {
        for (const [, hand] of mutation.mob.held_items) {
            if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

            if ("damage" in next) hand.force = next.damage;
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
            if ("noRevive" in next) {
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

    if ("traits" in next) {
        mutation.mob.add_traits(next.traits, "zs_class");
    }

    if ("damageResist" in next) {
        const physiology = mutation.mob.physiology;
        for (const damageType of damageTypes) {
            const current = physiology[damageType];

            if (damageType === "siemens_coeff") {
                physiology[damageType] = current - 0.8;
            } else {
                physiology[damageType] = current - 0.01 * next.damageResist;
            }
        }
    }

    if ("onGain" in next) next.onGain(mutation);

    // #endregion
}

// #region Helpers

function registerClassSignal<S extends keyof SignalRegistry<Byond.Mob.Living.Carbon.Human>>(
    mutation: MutationData,
    signal: S,
    callback: SignalRegistry<Byond.Mob.Living.Carbon.Human>[S]
) {
    SS13.register_signal(mutation.mob, signal, callback);
    table.insert(mutation.cleanup, {
        target: mutation.mob,
        signal,
        callback,
    });
}
function registerClassSignal2<S extends keyof SignalRegistry<Byond.Mob.Living.Carbon.Human>>(
    humanData: MutationData,
    target: Byond.Mob.Living.Carbon.Human,
    signal: S,
    callback: SignalRegistry<Byond.Mob.Living.Carbon.Human>[S]
) {
    SS13.register_signal(target, signal, callback);
    table.insert(humanData.cleanup, {
        target,
        signal,
        callback,
    });
}

// #endregion
