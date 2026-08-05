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
import { pick } from "../common/utils";
import { icon } from "../common/web-loader";
import {
    cultActions,
    itemActions,
    minorAntagActions,
    slimeActions,
    tankDeathSound,
    tankFootstepSound,
    tankRoarSounds,
    targetPointer,
} from "./assets";
import { damageTypes } from "./constants";
import { makeZombieController } from "./controller";
import { foamSpawner } from "./fluid";
import { isZombieSpecies, makeHearersVulnerable } from "./utils";
import type { Zombie } from "./zombie";

// #region Zombie Classes

/**
 * One instance per mob, created by `Zombie.setClass` and thrown away when the class changes. Anything that only
 * makes sense while the class is applied belongs here rather than on the `Zombie` record.
 */
export abstract class ZombieClass {
    /** The record this class is attached to. */
    protected readonly zombie: Zombie;

    /**
     * Mirrors `zombie.mob`. A plain field rather than an accessor on purpose, tstl compiles getters through a
     * metatable, and this is read constantly.
     */
    protected readonly mob: Byond.Mob.Living.Carbon.Human;

    /**
     * Signals and callbacks that live exactly as long as this instance does. Drained by `teardown`.
     *
     * @shouldnotsleep
     */
    private cleanup: (
        | { target: Byond.Datum; signal: keyof SignalRegistry; callback: (...args: any[]) => any }
        | ((...args: any[]) => void)
    )[] = [];

    /** Actions granted from `abilities`, deleted by `teardown`. */
    private grantedActions: Byond.Datum.Action.Cooldown[] = [];

    /** Traits applied to the mob while this class is active. */
    readonly traits?: TupleOf<string>;

    /** Abilities granted while this class is active. Declare them as a field so they can close over `this`. */
    readonly abilities: readonly AbilityBuilder[] = [];

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

    constructor(zombie: Zombie) {
        this.zombie = zombie;
        this.mob = zombie.mob;
    }

    /** Runs after the class has been applied. `zombie.state` already points at this instance. */
    onGain(): void {}

    /** Runs before the class is torn down, ahead of `teardown` and trait removal. */
    onLoss(_deleted: boolean): void {}

    /**
     * Whether this is still the mob's active class. Anything deferred with `invokeAsync` has to check it, the
     * class can change between the signal firing and the deferred body running.
     */
    protected isActive() {
        return this.zombie.state === this;
    }

    /**
     * Registers a signal that only lives as long as this class does, `teardown` unregisters it on the way out.
     * Use this instead of `SS13.register_signal` from `onGain`, otherwise the handler outlives the class.
     * @shouldnotsleep
     */
    protected registerSignal<T extends Byond.Datum, S extends keyof SignalRegistry<T>>(
        target: T,
        signal: S,
        callback: SignalRegistry<T>[S]
    ) {
        SS13.register_signal(target, signal, callback);
        table.insert(this.cleanup, { target, signal, callback });
    }

    /**
     * Applies everything this class's own data describes, then hands over to `onGain`.
     *
     * Called by `Zombie.setClass`, and only after the species switch, the mutant hands below do not exist
     * until the mob is a zombie. `teardown` is the exact inverse; keep the two in step.
     */
    apply() {
        for (const ability of this.abilities) {
            table.insert(this.grantedActions, grantAbility(this.mob, ability));
        }

        if (this.slowdown !== undefined) {
            let slowdown = this.slowdown;

            if (this.slowdownRandom !== undefined) {
                let adjusted = math.floor(math.random() * this.slowdownRandom * 1_000) / 1_000;
                if (math.random(0, 1) === 1) adjusted *= -1;
                slowdown += adjusted;
            }

            this.mob.add_or_update_variable_movespeed_modifier(
                SS13.type("/datum/movespeed_modifier/admin_varedit"),
                true,
                slowdown
            );
        }

        if (isZombieSpecies(this.mob)) {
            const demolitionMod = this.demolitionMod ?? 2;

            for (const [, hand] of this.mob.held_items) {
                if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

                if (this.damage !== undefined) hand.force = this.damage;
                hand.demolition_mod = demolitionMod;

                this.registerSignal(hand, "item_pre_attack", (_source, target) => {
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
        }

        if (this.traits && this.traits.length > 0) {
            this.mob.add_traits(this.traits, "zs_class");
        }

        if (this.damageResist !== undefined) {
            const physiology = this.mob.physiology;
            for (const damageType of damageTypes) {
                const current = physiology[damageType];

                if (damageType === "siemens_coeff") {
                    physiology[damageType] = current - 0.8;
                } else {
                    physiology[damageType] = current - 0.01 * this.damageResist;
                }
            }
        }

        this.onGain();
    }

    /**
     * Undoes `apply`, starting with `onLoss`. Called by `Zombie.setClass`; the instance is discarded
     * afterwards, so this is the mob's only chance to get its state back.
     *
     * @shouldnotsleep
     */
    teardown() {
        const deleted = !SS13.is_valid(this.mob);

        this.onLoss(deleted);

        for (const registered of this.cleanup) {
            if (typeof registered === "function") registered();
            else SS13.unregister_signal(registered.target, registered.signal, registered.callback);
        }
        this.cleanup = [];

        for (const action of this.grantedActions) {
            SS13.qdel(action);
        }
        this.grantedActions = [];

        // early return if the mob is gone, since the rest of this is all about restoring its state
        if (deleted) return;

        this.mob.remove_movespeed_modifier(SS13.type("/datum/movespeed_modifier/admin_varedit"));

        for (const [, hand] of this.mob.held_items) {
            if (SS13.istype(hand, "/obj/item/mutant_hand/zombie")) {
                hand.force = 21;
            }
        }

        if (this.traits && this.traits.length > 0) {
            this.mob.remove_traits(this.traits, "zs_class");
        }

        if (this.damageResist !== undefined) {
            const physiology = this.mob.physiology;
            for (const damageType of damageTypes) {
                const current = physiology[damageType];

                if (damageType === "siemens_coeff") {
                    physiology[damageType] = current + 0.8;
                } else {
                    physiology[damageType] = current + 0.01 * this.damageResist;
                }
            }
        }
    }
}

export abstract class SpecialZombie extends ZombieClass {
    override readonly traits: TupleOf<string> = ["nohardcrit", "nosoftcrit"];

    /** `icon_state` on the zombie overlay sheet. */
    protected abstract readonly appearance: string;

    /** One `/mutable_appearance` per icon state, shared by every zombie wearing it. */
    private static readonly appearanceCache: Record<string, Byond.MutableAppearance> = {};

    /** What `setAppearance` added, kept so `resetAppearance` cuts exactly that. */
    private overlay?: Byond.MutableAppearance;

    override onGain() {
        this.setAppearance();
    }

    override onLoss(deleted: boolean) {
        if (!deleted) {
            this.resetAppearance();
        }
    }

    /** Hides the mob and draws `appearance` on top of it instead. */
    protected setAppearance() {
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

        this.mob.alpha = 0;
        this.mob.add_overlay(appearance);
        this.overlay = appearance;
    }

    protected resetAppearance() {
        if (this.overlay) {
            this.mob.alpha = 255;
            this.mob.cut_overlay(this.overlay);
            this.overlay = undefined;
        }
    }
}

export class NonZombie extends ZombieClass {
    override onGain() {
        const infection = this.mob.get_organ_slot("zombie_infection");

        if (infection) {
            SS13.qdel(infection);
        }

        this.registerSignal(this.mob, "atom_entered", (source, arrived) => {
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

        this.registerSignal(this.mob, "carbon_gain_organ", (_source, organ) => {
            if (SS13.istype(organ, "/obj/item/organ/zombie_infection")) {
                organ.organ_flags = _G.bit32.bor(organ.organ_flags, 768); // unremovable (256) | hidden (512)
            }
        });
    }
}

export class ZombieController extends ZombieClass {
    override onGain() {
        invokeAsync(() => {
            if (!this.isActive()) return;

            const controller = makeZombieController(SS13.get_turf(this.mob));

            const mind = this.mob.mind;

            if (mind) {
                mind.transfer_to(controller);
                controller.reset_perspective(controller);
            }

            this.zombie.setClass("Zombie (AI)");
        });
    }
}

export class BasicZombie extends ZombieClass {
    override readonly slowdown = 0.75;
    override readonly slowdownRandom = 0.5;
    override readonly damageResist = -60;
    override readonly noRevive = true;
    override readonly traits = ["nohardcrit", "nosoftcrit"] as const;

    override onGain() {
        const head = this.mob.get_bodypart("head");
        if (head) head.bodypart_flags = _G.bit32.bor(head.bodypart_flags, 1); // adds unremoveable (1)

        this.registerSignal(this.mob, "atom_entered", (source, arrived) => {
            if (has_trait(arrived, "zs_zombie_cure")) {
                invokeAsync(() => {
                    if (!this.isActive()) return;

                    if (source.stat !== 4) {
                        source.death();
                    }

                    source.notify_revival("You are being unzombified!");
                    source.grab_ghost();

                    const infection = source.get_organ_slot("zombie_infection");

                    if (SS13.is_valid(infection)) {
                        SS13.qdel(infection);
                        to_chat(
                            source,
                            "<span class='notice'>You feel a wave of relief and tranquility, and your mind feels clear.</span>"
                        );
                    }

                    SS13.qdel(arrived);

                    this.zombie.setClass("Non-Zombie");
                });
            }
        });
    }

    override onLoss(deleted: boolean) {
        if (!deleted) {
            const head = this.mob.get_bodypart("head");
            if (head) head.bodypart_flags = _G.bit32.band(head.bodypart_flags, _G.bit32.bnot(1)); // removes unremoveable (1)
        }
    }
}

export class AiZombie extends BasicZombie {
    static readonly aiEnabled = true;

    override onGain() {
        super.onGain();

        if (AiZombie.aiEnabled) {
            invokeAsync(() => {
                if (!this.isActive()) return;
                if (SS13.is_valid(this.mob)) this.mob.ghostize(true);
            });
        }
    }
}

export class Boomer extends SpecialZombie {
    protected readonly appearance = "boomer";

    override readonly abilities: readonly AbilityBuilder[] = [
        {
            name: "Detonate yourself",
            icon: slimeActions,
            icon_state: "gel_cocoon",
            abilityType: "normal",
            cooldown: 10,
            onActivate: () => {
                invokeAsync(() => {
                    if (this.isActive()) this.explode(false, 1);
                });
            },
        },
        {
            name: "Spew bile",
            icon: slimeActions,
            icon_state: "consume",
            abilityType: "targeted",
            pointerIcon: targetPointer,
            cooldown: 30,
            onActivate: (_action, target) => {
                if (!SS13.is_valid(this.mob) || has_trait(this.mob, "immobilized") || this.mob.body_position === 1)
                    return 1;

                invokeAsync(() => {
                    playsound(this.mob, "sound/effects/splat.ogg", 100, true);

                    const fluidGroup = SS13.new("/datum/fluid_group", 9);
                    const spawnFoam = foamSpawner(fluidGroup, "#5050FF", "/datum/reagent/blob/networked_fibers", 30);

                    const position = assert(this.mob.drop_location());
                    const line = dm.global_procs.get_line(position, target);

                    makeHearersVulnerable(position);
                    add_trait(this.mob, "block_transformations", "zs_bile_spewing");

                    let endLoop = false;
                    let currentTurf: Byond.Turf | undefined;
                    let previousTurf = SS13.get_turf(position);
                    let currentDirection = get_dir(previousTurf, target);

                    SS13.start_loop(0.1, 5, (iteration) => {
                        if (endLoop || iteration === 5) {
                            remove_trait(this.mob, "block_transformations", "zs_bile_spewing");
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
    ];

    override onGain() {
        super.onGain();

        this.registerSignal(this.mob, "living_death", (_source, gibbed) => {
            invokeAsync(() => {
                if (this.isActive()) this.explode(gibbed === 1, 1);
            });
        });

        this.registerSignal(this.mob, "atom_expose_reagents", (_source, reagents) => {
            for (const [reagent] of reagents) {
                if (SS13.istype(reagent, "/datum/reagent/blob/networked_fibers")) {
                    return 1;
                }
            }
        });

        this.mob.resistance_flags = 48; // unacidable (16) | acidproof (32)
    }

    override onLoss(deleted: boolean) {
        super.onLoss(deleted);

        if (!deleted) {
            this.mob.resistance_flags = 0;
        }
    }

    explode(gibbed: boolean, extraRange: number) {
        if (!SS13.is_valid(this.mob)) return;

        playsound(this.mob, "sound/effects/splat.ogg", 100, true);

        const position = assert(this.mob.drop_location());
        makeHearersVulnerable(position);

        if (!gibbed) this.mob.gib();

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
    protected readonly appearance = "jockey";

    /** The mob currently being ridden, if any. */
    private riding?: Byond.Atom.Movable;

    /**
     * Ends the current ride. The handlers that would normally end it belong to a `HandlerGroup`, not to this
     * class, so losing the class does not unregister them, `onLoss` has to call this or the victim stays
     * ridden with nothing left to release them.
     */
    private cancelRide?: () => void;

    override readonly abilities: readonly AbilityBuilder[] = [
        {
            name: "Leap",
            icon: itemActions,
            icon_state: "jetboot",
            abilityType: "targeted",
            pointerIcon: targetPointer,
            cooldown: 15,
            onActivate: (_action, target) => {
                if (this.riding && SS13.is_valid(this.riding)) return 1;

                const handleImpact = (zombie: Byond.Mob.Living.Carbon.Human, victim: Byond.Atom): 0 => {
                    SS13.unregister_signal(zombie, "movable_pre_impact", handleImpact);

                    if (
                        !SS13.istype(victim, "/mob/living/carbon/human") ||
                        has_trait(victim, "zs_being_ridden") ||
                        isZombieSpecies(victim) ||
                        victim.body_position === 1
                    )
                        return 0;

                    zombie.remote_control = victim;
                    zombie.pixel_z = 12;
                    zombie.layer += 0.1;
                    zombie.forceMove(assert(victim.loc));

                    victim.add_traits(["block_transformations", "zs_being_ridden", "sleep_immunity"], "zombie_riding");
                    victim.mobility_flags = _G.bit32.band(victim.mobility_flags, _G.bit32.bnot(384)); // rest (128) | liedown (256)
                    victim.emote("scream");

                    this.riding = victim;

                    let cancel: () => void;

                    const screamLoop = SS13.start_loop(5, -1, () => victim.emote("scream"));

                    const group = HandlerGroup.new();

                    const action = grantAbility(zombie, {
                        name: "Dismount",
                        icon: minorAntagActions,
                        icon_state: "infect",
                        abilityType: "normal",
                        cooldown: 0,
                        onActivate() {
                            cancel();
                            return 1;
                        },
                    });

                    cancel = () => {
                        if (SS13.is_valid(zombie)) {
                            zombie.remote_control = undefined;
                            zombie.pixel_z = 0;
                            zombie.layer -= 0.1;
                        }

                        if (SS13.is_valid(victim)) {
                            victim.remove_traits(
                                ["block_transformations", "zs_being_ridden", "sleep_immunity"],
                                "zombie_riding"
                            );
                            victim.mobility_flags = _G.bit32.bor(victim.mobility_flags, 384); // rest (128) | liedown (256)
                        }

                        this.riding = undefined;
                        this.cancelRide = undefined;

                        group.clear();
                        SS13.end_loop(screamLoop);
                        if (SS13.is_valid(action)) SS13.qdel(action);
                    };

                    this.cancelRide = cancel;

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

                        zombie.forceMove(assert(victim.loc));

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
                };

                SS13.register_signal(this.mob, "movable_pre_impact", handleImpact);

                playsound(this.mob, "sound/weapons/fwoosh.ogg", 100, true);

                this.mob.throw_at(target, 5, 3, this.mob, false, false, undefined, 2_000, true);

                SS13.set_timeout(5, () => {
                    if (SS13.is_valid(this.mob)) {
                        SS13.unregister_signal(this.mob, "movable_pre_impact", handleImpact);
                    }
                });
            },
        },
    ];

    override onGain() {
        super.onGain();
        this.mob.pass_flags = 1; // passtable (1)
    }

    override onLoss(deleted: boolean) {
        super.onLoss(deleted);
        this.cancelRide?.();

        if (!deleted) {
            this.mob.pass_flags = 0;
        }
    }
}

export class Smoker extends SpecialZombie {
    override readonly slowdown = 1;
    override readonly damage = 31;
    override readonly noRevive = true;
    protected readonly appearance = "smoker";

    /** The hook currently in flight. Only one at a time, firing again deletes the previous one. */
    private meathook?: Byond.Obj.Item.AmmoCasing.Magic.Hook;

    override readonly abilities: readonly AbilityBuilder[] = [
        {
            name: "Entangle",
            icon: cultActions,
            icon_state: "carve",
            abilityType: "targeted",
            pointerIcon: targetPointer,
            cooldown: 15,
            onActivate: (_action, target) => {
                if (!SS13.is_valid(this.mob) || has_trait(this.mob, "immobilized") || this.mob.body_position === 1)
                    return 1;

                invokeAsync(() => {
                    if (SS13.is_valid(this.meathook)) {
                        SS13.qdel(this.meathook);
                    }

                    const meathook = SS13.new("/obj/item/ammo_casing/magic/hook", this.mob);

                    this.meathook = meathook;

                    SS13.register_signal(
                        meathook,
                        "fire_casing",
                        (_1, _2, _3, _f4, _5, _6, _7, _8, _9, thrown_proj) => {
                            if (!SS13.is_valid(thrown_proj)) return;

                            SS13.register_signal(thrown_proj, "projectile_self_on_hit", (_1, _2, target) => {
                                if (has_trait(target, "hooked")) return;

                                add_trait(target, "block_transformations", "zs_hooked");

                                HandlerGroup.register_once(target, "removetrait hooked", () => {
                                    remove_trait(target, "block_transformations", "zs_hooked");
                                });
                            });
                        }
                    );

                    meathook.fire_casing(target, this.mob, undefined, undefined, undefined, "chest", 0, this.mob);

                    playsound(this.mob, "sound/weapons/batonextend.ogg", 100);
                });
            },
        },
    ];

    override onLoss(deleted: boolean) {
        super.onLoss(deleted);

        if (SS13.is_valid(this.meathook)) {
            SS13.qdel(this.meathook);
        }
    }
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
    protected readonly appearance = "tank";

    override readonly abilities: readonly AbilityBuilder[] = [
        {
            name: "Roar",
            icon: itemActions,
            icon_state: "berserk_mode",
            abilityType: "normal",
            cooldown: 15,
            onActivate: () => {
                playsound(this.mob, pick(tankRoarSounds), 100);
                invokeAsync(() => this.mob.emote("me", 1, "roars!", true)); // not sure whether /emote is blocking
            },
        },
    ];

    override onGain() {
        super.onGain();

        const sound = pick(tankRoarSounds);
        playsound(this.mob, sound, 80, true, 15, 1.5, undefined, 0, true, true, 8);

        for (const [, hand] of this.mob.held_items) {
            if (!SS13.istype(hand, "/obj/item/mutant_hand/zombie")) continue;

            this.registerSignal(hand, "item_afterattack", (_source, target, user) => {
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

            this.registerSignal(hand, "item_interacting_with_atom", (_source, _user, interactingWith) => {
                if (!SS13.istype(interactingWith, "/turf/closed/wall")) return;
                this.mob.UnarmedAttack(interactingWith, 1);
                return 1;
            });
        }

        this.mob._AddElement([SS13.type("/datum/element/wall_tearer"), true, 80, 3]);

        let steps = 0;
        let nextPlay = 0;

        this.registerSignal(this.mob, "movable_moved", (_source, _old_loc, _direction) => {
            if (this.mob.body_position === 1) return;

            const worldTime = dm.world.time;

            if (++steps < 2 || nextPlay > worldTime) return;

            nextPlay = worldTime + 6;
            steps = 0;

            playsound(this.mob, pick(tankFootstepSound), 20, true, 15, 1.5, undefined, 0, true, true, 8);
        });

        this.mob._RemoveElement([SS13.type("/datum/element/footstep"), "footstep_human", 1, -6]);

        this.registerSignal(this.mob, "living_death", (_source, _gibbed) => {
            playsound(this.mob, pick(tankDeathSound), 40, true, 15, 1.5, undefined, 0, true, true, 8);
        });

        this.mob.status_flags = 0; // all immunity
    }

    override onLoss(deleted: boolean) {
        super.onLoss(deleted);

        if (!deleted) {
            this.mob._RemoveElement([SS13.type("/datum/element/wall_tearer"), true, 80, 3]);
            this.mob._AddElement([SS13.type("/datum/element/footstep"), "footstep_human", 1, -6]);
            this.mob.status_flags = 15; // revert to human
        }
    }
}

/**
 * The class registry. These are constructors, not instances, `Zombie.setClass` builds one per mob.
 * `keyof typeof zombieClasses` is the canonical class-name union used throughout the script.
 */
export const zombieClasses = {
    "Non-Zombie": NonZombie,
    "Zombie Controller": ZombieController,
    Zombie: BasicZombie,
    "Zombie (AI)": AiZombie,
    Boomer: Boomer,
    Jockey: Jockey,
    Smoker: Smoker,
    Tank: Tank,
} as const satisfies Record<string, new (zombie: Zombie) => ZombieClass>;

// #endregion
