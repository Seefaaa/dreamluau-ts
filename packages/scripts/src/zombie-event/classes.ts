import * as SS13 from "SS13";
import * as HandlerGroup from "handler_group";
import { type AbilityBuilder, grantAbility } from "../common/ability";
import { invokeAsync } from "../common/async";
import {
    add_trait,
    explosion,
    get_dir,
    get_step,
    has_trait,
    playsound,
    ref,
    remove_trait,
    to_chat,
    turn,
} from "../common/globals";
import { pickRandom } from "../common/utils";
import { icon } from "../common/web-loader";
import { damageTypes } from "./constants";
import { makeZombieController } from "./controller";
import { foamSpawner } from "./fluid";
import type { MutationData } from "./mutation";
import { tankDeathSound, tankFootstepSound, tankRoarSounds } from "./sounds";
import { isZombieSpecies, makeHearersVulnerable } from "./utils";

// #region Zombie Classes

export abstract class ZombieClass {
    /** Traits applied to the mob while this class is active. */
    readonly traits?: TupleOf<string>;

    /** Abilities granted while this class is active. They are removed by `setClass`. */
    readonly abilities: readonly (keyof typeof zombieAbilities)[] = [];

    /** Melee force of the zombie's mutant hands. Left alone when undefined. */
    readonly damage?: number;

    /** Movespeed modifier. `0` is a valid value, so this is checked against `undefined`, not truthiness. */
    readonly slowdown?: number;

    /** Jitters `slowdown` per mob by up to this much in either direction. */
    readonly slowdownRandom?: number;

    /** Percentage of damage resisted. Negative means the mob takes *more* damage. */
    readonly damageResist?: number;

    /** Multiplier applied when attacking structures. Defaults to 2 when undefined. */
    readonly demolitionMod?: number;

    /** Stops the infection organ from reviving the mob on death. */
    readonly noRevive: boolean = false;

    /** Runs after the class has been applied. `mutation.class` is already set to this class. */
    onGain(_mutation: MutationData): void {}

    /** Runs before the class is torn down, ahead of the cleanup callbacks and trait removal. */
    onLoss(_mutation: MutationData): void {}

    /**
     * Registers a signal that only lives as long as this class does — `setClass` unregisters it on the way out.
     * Use this instead of `SS13.register_signal` from `onGain`, otherwise the handler outlives the class.
     * @shouldnotsleep
     */
    protected registerSignal<T extends Byond.Datum, S extends keyof SignalRegistry<T>>(
        mutation: MutationData,
        target: T,
        signal: S,
        callback: SignalRegistry<T>[S]
    ) {
        SS13.register_signal(target, signal, callback);
        table.insert(mutation.cleanup, { target, signal, callback });
    }

    /** Applies `newClass` to `mutation`, tearing down whatever class it had before. */
    static setClass(this: void, mutation: MutationData, newClass: keyof typeof zombieClasses | undefined) {
        if (mutation.class === newClass) return;

        // #region Revert previous effects

        const previousClass = mutation.class && zombieClasses[mutation.class];

        if (previousClass) previousClass.onLoss(mutation);

        // run cleanup callbacks
        for (const registered of mutation.cleanup) {
            if (typeof registered === "function") registered();
            else SS13.unregister_signal(registered.target, registered.signal, registered.callback);
        }
        mutation.cleanup = [];

        // remove traits
        if (previousClass && previousClass.traits && previousClass.traits.length > 0) {
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

        if (previousClass?.damageResist !== undefined) {
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

        for (const ability of nextClass.abilities) {
            table.insert(grantedAbilities, grantAbility(mutation.mob, mutation, zombieAbilities[ability]));
        }

        table.insert(mutation.cleanup, () => {
            for (const ability of grantedAbilities) {
                SS13.qdel(ability);
            }
        });

        mutation.class = newClass;

        if (nextClass.slowdown !== undefined) {
            let slowdown = nextClass.slowdown;

            if (nextClass.slowdownRandom !== undefined) {
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
            if (nextClass instanceof NonZombie) {
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
            if (!(nextClass instanceof NonZombie)) {
                mutation.mob.set_species(SS13.type("/datum/species/zombie/infectious"));
                mutation.oldVoice = mutation.mob.voice;
                mutation.mob.voice = "Man (Big)";
            }
        }

        if (
            !mutation.antagDatum &&
            !(mutation.spawned || newClass !== "Zombie (AI)") &&
            !(nextClass instanceof NonZombie)
        ) {
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
            mutation.antagDatum.antagpanel_category =
                nextClass instanceof BasicZombie ? "Infected" : "Special Infected";
        }

        const demolitionMod = nextClass.demolitionMod ?? 2;

        if (isZombieSpecies(mutation.mob)) {
            for (const [, hand] of mutation.mob.held_items) {
                if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

                if (nextClass.damage !== undefined) hand.force = nextClass.damage;
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
                        else if (SS13.istype(target, "/obj/structure/window/reinforced/plasma"))
                            hand.demolition_mod = 10;
                        else if (SS13.istype(target, "/obj/structure/window/reinforced")) hand.demolition_mod = 5;
                        else if (SS13.istype(target, "/obj/structure/window/plasma")) hand.demolition_mod = 5;
                    } else if (hasBarricade && hasWindow) hand.demolition_mod = demolitionMod * 0.25;

                    invokeAsync(() => {
                        hand.demolition_mod = demolitionMod;
                    });
                });
            }

            const infection = mutation.mob.get_organ_slot("zombie_infection");

            if (SS13.is_valid(infection)) {
                if (nextClass.noRevive) {
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

        if (nextClass.traits && nextClass.traits.length > 0) {
            mutation.mob.add_traits(nextClass.traits, "zs_class");
        }

        if (nextClass.damageResist !== undefined) {
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

        nextClass.onGain(mutation);

        // #endregion
    }
}

export abstract class SpecialZombie extends ZombieClass {
    override readonly traits: TupleOf<string> = ["nohardcrit", "nosoftcrit"];

    /** `icon_state` on the zombie overlay sheet. */
    protected abstract readonly appearance: string;

    /** One `/mutable_appearance` per icon state, shared by every zombie wearing it. */
    private static readonly appearanceCache: Record<string, Byond.MutableAppearance> = {};

    override onGain(mutation: MutationData) {
        this.setAppearance(mutation);
    }

    override onLoss(mutation: MutationData) {
        this.resetAppearance(mutation);
    }

    /** Hides the mob and draws `appearance` on top of it instead. */
    protected setAppearance(mutation: MutationData) {
        let appearance = SpecialZombie.appearanceCache[this.appearance];

        if (!appearance) {
            appearance = SS13.new("/mutable_appearance");
            appearance.icon = icon(
                "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/zombie.dmi"
            );
            appearance.icon_state = this.appearance;
            appearance.appearance_flags = 837;
            SpecialZombie.appearanceCache[this.appearance] = appearance;
        }

        mutation.mob.alpha = 0;
        mutation.mob.add_overlay(appearance);
        mutation.overlay = appearance;
    }

    protected resetAppearance(mutation: MutationData) {
        if (mutation.overlay) {
            mutation.mob.alpha = 255;
            mutation.mob.cut_overlay(mutation.overlay);
        }
    }
}

export class NonZombie extends ZombieClass {
    override onGain(mutation: MutationData) {
        const infection = mutation.mob.get_organ_slot("zombie_infection");

        if (infection) {
            SS13.qdel(infection);
        }

        this.registerSignal(mutation, mutation.mob, "atom_entered", (source, arrived) => {
            if (has_trait(arrived, "zs_zombie_cure")) {
                invokeAsync(() => {
                    const infection = source.get_organ_slot("zombie_infection");

                    if (infection) {
                        SS13.qdel(infection);
                        to_chat(
                            source,
                            "<span class='notice'>You feel a wave of relief and tranquility, and your mind feels clear.</span>"
                        );
                    }

                    source.set_tox_loss(0);

                    SS13.qdel(arrived);
                });
            }
        });

        this.registerSignal(mutation, mutation.mob, "carbon_gain_organ", (_source, organ) => {
            if (SS13.istype(organ, "/obj/item/organ/zombie_infection")) {
                organ.organ_flags = _G.bit32.bor(organ.organ_flags, 768); // unremovable (256) | hidden (512)
            }
        });
    }
}

export class ZombieController extends ZombieClass {
    override onGain(mutation: MutationData) {
        invokeAsync(() => {
            const controller = makeZombieController(SS13.get_turf(mutation.mob), ZombieClass.setClass);

            const mind = mutation.mob.mind;

            if (mind) {
                mind.transfer_to(controller);
                controller.reset_perspective(controller);
            }

            ZombieClass.setClass(mutation, "Zombie (AI)");
        });
    }
}

export class BasicZombie extends ZombieClass {
    override readonly slowdown = 0.75;
    override readonly slowdownRandom = 0.5;
    override readonly damageResist = -60;
    override readonly noRevive = true;
    override readonly traits = ["nohardcrit", "nosoftcrit"] as const;

    override onGain(mutation: MutationData) {
        const head = mutation.mob.get_bodypart("head");
        if (head) head.bodypart_flags = _G.bit32.bor(head.bodypart_flags, 1); // adds unremoveable (1)

        this.registerSignal(mutation, mutation.mob, "atom_entered", (source, arrived) => {
            if (has_trait(arrived, "zs_zombie_cure")) {
                invokeAsync(() => {
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

                    SS13.qdel(arrived);

                    ZombieClass.setClass(mutation, "Non-Zombie");
                });
            }
        });
    }

    override onLoss(mutation: MutationData) {
        if (mutation.zombieAi) {
            // mutation.zombieAi.stop();
            mutation.zombieAi = undefined;
        }

        const head = mutation.mob.get_bodypart("head");
        if (head) head.bodypart_flags = _G.bit32.band(head.bodypart_flags, _G.bit32.bnot(1)); // removes unremoveable (1)
    }
}

export class AiZombie extends BasicZombie {
    readonly aiEnabled = true;

    override onGain(mutation: MutationData) {
        super.onGain(mutation);

        if (this.aiEnabled) {
            // const ai = createZombieAi(mutation);
            // mutation.zombieAi = ai;
            invokeAsync(() => {
                mutation.mob.ghostize(true);
            });
        }
    }
}

export class Boomer extends SpecialZombie {
    override readonly abilities = ["bomber_explode", "boomer_spew"] as const;
    protected readonly appearance = "boomer";

    override onGain(mutation: MutationData) {
        super.onGain(mutation);

        this.registerSignal(mutation, mutation.mob, "living_death", (_source, gibbed) => {
            invokeAsync(() => {
                const classDef = mutation.class && zombieClasses[mutation.class];
                if (classDef instanceof Boomer) classDef.explode(mutation, gibbed === 1, 1);
            });
        });

        this.registerSignal(mutation, mutation.mob, "atom_expose_reagents", (_source, reagents) => {
            for (const [reagent] of reagents) {
                if (SS13.istype(reagent, "/datum/reagent/blob/networked_fibers")) {
                    return 1;
                }
            }
        });

        mutation.mob.resistance_flags = 48; // unacidable (16) | acidproof (32)
    }

    override onLoss(mutation: MutationData) {
        super.onLoss(mutation);
        mutation.mob.resistance_flags = 0;
    }

    explode(mutation: MutationData, gibbed: boolean, extraRange: number) {
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
    }
}

export class Jockey extends SpecialZombie {
    override readonly slowdown = -1.5;
    override readonly damage = 11;
    override readonly noRevive = true;
    override readonly traits = ["passtable", "ventcrawler_always", "nohardcrit", "nosoftcrit"] as const;
    override readonly abilities = ["jockey_leap"] as const;
    protected readonly appearance = "jockey";

    override onGain(mutation: MutationData) {
        super.onGain(mutation);
        mutation.mob.pass_flags = 1; // passtable (1)
    }

    override onLoss(mutation: MutationData) {
        super.onLoss(mutation);
        mutation.mob.pass_flags = 0;
    }
}

export class Smoker extends SpecialZombie {
    override readonly slowdown = 1;
    override readonly damage = 31;
    override readonly noRevive = true;
    override readonly abilities = ["smoker_hook"] as const;
    protected readonly appearance = "smoker";
}

export class Tank extends SpecialZombie {
    override readonly slowdown = 0;
    override readonly damage = 30;
    override readonly demolitionMod = 6;
    override readonly damageResist = 50;
    override readonly noRevive = true;
    override readonly traits = [
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
    ] as const;
    override readonly abilities = ["tank_roar"] as const;
    protected readonly appearance = "tank";

    override onGain(mutation: MutationData) {
        super.onGain(mutation);

        const sound = pickRandom(tankRoarSounds);
        playsound(mutation.mob, sound, 80, true, 15, 1.5, undefined, 0, true, true, 8);

        for (const [, hand] of mutation.mob.held_items) {
            if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

            this.registerSignal(mutation, hand, "item_afterattack", (_source, target, user) => {
                if (!SS13.istype(target, "/mob/living")) return;

                const dir = get_dir(user, target);
                let targetTurf = SS13.get_turf(user);

                for (const _ of $range(1, 8)) {
                    const nextTurf = get_step(targetTurf, dir);
                    if (nextTurf.is_blocked_turf(true, target) === 1) break;
                    targetTurf = nextTurf;
                }

                target.Knockdown(20);
                target.throw_at(targetTurf, 8, 2);
            });

            this.registerSignal(mutation, hand, "item_interacting_with_atom", (_source, _user, interactingWith) => {
                if (!SS13.istype(interactingWith, "/turf/closed/wall")) return;
                mutation.mob.UnarmedAttack(interactingWith, 1);
                return 1;
            });
        }

        mutation.mob._AddElement([SS13.type("/datum/element/wall_tearer"), true, 80, 3]);

        let steps = 0;
        let nextPlay = 0;

        this.registerSignal(mutation, mutation.mob, "movable_moved", (_source, _old_loc, _direction) => {
            if (mutation.mob.body_position === 1) return;

            const worldTime = dm.world.time;

            if (++steps < 2 || nextPlay > worldTime) return;

            nextPlay = worldTime + 6;

            const sound = pickRandom(tankFootstepSound);
            playsound(mutation.mob, sound, 20, true, 15, 1.5, undefined, 0, true, true, 8);

            steps = 0;
        });

        mutation.mob._RemoveElement([SS13.type("/datum/element/footstep"), "footstep_human", 1, -6]);

        this.registerSignal(mutation, mutation.mob, "living_death", (_source, _gibbed) => {
            const sound = pickRandom(tankDeathSound);
            playsound(mutation.mob, sound, 40, true, 15, 1.5, undefined, 0, true, true, 8);
        });

        mutation.mob.status_flags = 0; // all immunity
    }

    override onLoss(mutation: MutationData) {
        super.onLoss(mutation);
        mutation.mob._RemoveElement([SS13.type("/datum/element/wall_tearer"), true, 80, 3]);
        mutation.mob._AddElement([SS13.type("/datum/element/footstep"), "footstep_human", 1, -6]);
        mutation.mob.status_flags = 15; // revert to human
    }
}

export const zombieClasses = {
    "Non-Zombie": new NonZombie(),
    "Zombie Controller": new ZombieController(),
    Zombie: new BasicZombie(),
    "Zombie (AI)": new AiZombie(),
    Boomer: new Boomer(),
    Jockey: new Jockey(),
    Smoker: new Smoker(),
    Tank: new Tank(),
} as const satisfies Record<string, ZombieClass>;

// #endregion

// #region Zombie Abilities

export const zombieAbilities = {
    bomber_explode: {
        name: "Detonate yourself",
        icon: icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_slime.dmi"),
        icon_state: "gel_cocoon",
        abilityType: "normal",
        cooldown: 10,
        onActivate: (context) => {
            invokeAsync(() => {
                const classDef = context.class && zombieClasses[context.class];
                if (classDef instanceof Boomer) classDef.explode(context, false, 1);
            });
        },
    },
    boomer_spew: {
        name: "Spew bile",
        icon: icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_slime.dmi"),
        icon_state: "consume",
        abilityType: "targeted",
        pointerIcon: icon(
            "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/effects/mouse_pointers/cult_target.dmi"
        ),
        cooldown: 30,
        onActivate(context, _action, target) {
            if (!SS13.is_valid(context.mob) || has_trait(context.mob, "immobilized") || context.mob.body_position === 1)
                return 1;

            invokeAsync(() => {
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
        icon: icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_cult.dmi"),
        icon_state: "carve",
        abilityType: "targeted",
        pointerIcon: icon(
            "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/effects/mouse_pointers/cult_target.dmi"
        ),
        cooldown: 15,
        onActivate(context, _action, target) {
            if (!SS13.is_valid(context.mob) || has_trait(context.mob, "immobilized") || context.mob.body_position === 1)
                return 1;

            invokeAsync(() => {
                if ("meathook" in context && SS13.is_valid(context.meathook)) {
                    SS13.qdel(context.meathook);
                }

                const meathook = SS13.new("/obj/item/ammo_casing/magic/hook", context.mob);

                context.meathook = meathook;

                SS13.register_signal(meathook, "fire_casing", (_1, _2, _3, _f4, _5, _6, _7, _8, _9, thrown_proj) => {
                    if (!SS13.is_valid(thrown_proj)) return;

                    SS13.register_signal(thrown_proj, "projectile_self_on_hit", (_1, _2, target) => {
                        invokeAsync(() => {
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
        icon: icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_items.dmi"),
        icon_state: "berserk_mode",
        abilityType: "normal",
        cooldown: 15,
        onActivate(context) {
            const sound = pickRandom(tankRoarSounds);
            playsound(context.mob, sound, 100);

            invokeAsync(() => {
                context.mob.emote("me", 1, "roars!", true);
            });
        },
    },

    jockey_leap: {
        name: "Leap",
        icon: icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_items.dmi"),
        icon_state: "jetboot",
        abilityType: "targeted",
        pointerIcon: icon(
            "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/effects/mouse_pointers/cult_target.dmi"
        ),
        cooldown: 15,
        onActivate(context, _action, target) {
            if ("riding" in context && context.riding && SS13.is_valid(context.riding)) return 1;

            invokeAsync(() => {
                if (!SS13.is_valid(context.mob)) return 1;

                playsound(context.mob, "sound/weapons/fwoosh.ogg", 100, true);

                const actionIcon = icon(
                    "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_minor_antag.dmi"
                );

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
                        icon: actionIcon,
                        icon_state: "infect",
                        abilityType: "normal",
                        cooldown: 0,
                        onActivate() {
                            cancel();
                        },
                    });

                    cancel = () => {
                        if (SS13.is_valid(zombie)) {
                            zombie.remote_control = undefined;
                            zombie.pixel_z = 0;
                            zombie.layer = 4;
                        }

                        if (SS13.is_valid(victim)) {
                            victim.remove_traits(
                                ["block_transformations", "zs_being_ridden", "sleep_immunity"],
                                "zombie_riding"
                            );
                            victim.mobility_flags = _G.bit32.bor(victim.mobility_flags, 384); // rest (128) | liedown (256)
                        }

                        context.riding = undefined;

                        group.clear();
                        SS13.end_loop(timer);
                        if (SS13.is_valid(action)) SS13.qdel(action);
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
