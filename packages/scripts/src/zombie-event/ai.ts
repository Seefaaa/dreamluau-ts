import * as SS13 from "SS13";
import * as HandlerGroup from "handler_group";
import { invokeAsync } from "../common/async";
import {
    animate,
    get_atom_on_turf,
    get_dir,
    get_dist,
    get_hearers_in_LOS,
    get_step,
    has_trait,
    rect_turfs,
    ref,
} from "../common/globals";
import { tickLag } from "../common/tick";
import { isCardinal, pick } from "../common/utils";
import { cardinals } from "./constants";
import { zombieControllerTargets } from "./controller";
import { isZombieSpecies } from "./utils";

// #region Registry

/**
 * Every AI that still exists, whether or not it is currently processing. The dispatch loop walks this and drops
 * the invalid ones; `makeInactive` pulls a zombie out and `makeActive` puts it back.
 */
const zombieAiList: ZombieAi[] = [];

/** The same objects keyed by `ref`, so a zombie's AI can be found from its mob in constant time. */
const zombieAiByRef: Record<string, ZombieAi> = {};

// Exposed for admin inspection, matching the original script's `CURRENT_ZOMBIE_AI_LIST`.
currentZombieAiList = zombieAiList;
zombieAiCount = 0;

/** The AI driving `mob`, if it has one. */
export function getZombieAi(mob: Byond.Atom): ZombieAi | undefined {
    return zombieAiByRef[ref(mob)];
}

/**
 * The horizontal pixel offsets a zombie may take when stacking onto an occupied tile, in the order they are
 * claimed. Two zombies plus the un-offset middle is as many as one tile takes.
 */
const offsets = [8, -8, 0] as const;

// #endregion

// #region Targeting

/**
 * Whether zombies should go after this atom: a human that is not itself a zombie, or a silicon someone is
 * actually playing.
 */
function isZombieTarget(target: Byond.Atom): target is Byond.Mob.Living {
    if (SS13.istype(target, "/mob/living/carbon/human")) {
        return !isZombieSpecies(target);
    }

    if (SS13.istype(target, "/mob/living/silicon")) {
        return SS13.is_valid(target.client);
    }

    return false;
}

// #endregion

// #region Zombie AI

/**
 * The behaviour of a single AI zombie: acquire a target, walk to it, hit it, and fall asleep when there has been
 * nothing to chase for a while.
 *
 * One instance per mob, owned by the `AiZombie` class, `teardown` calls `cleanup`, so changing class stops the
 * AI. Everything runs from `execute`, which the dispatch loop calls once per sweep.
 */
export class ZombieAi {
    /**
     * Whether `execute` should do anything. Cleared while dead, asleep, or torn down.
     */
    processing = true;

    /** Cleared by `cleanup`. An invalid AI is dropped from `zombieAiList` by the next dispatch pass. */
    valid = true;

    /** Whether this is currently in `zombieAiList`. Kept in step by `makeActive` / `makeInactive`. */
    private insideList = true;

    /** One zombie in five keeps attacking while lying down. */
    private readonly crawler = math.random(1, 5) === 1;

    private target?: Byond.Atom;

    private nextClickOn = 0;
    private nextGetup = 0;
    private nextTargetSearch = 0;
    private nextPath = 0;
    private nextRandomWander = 100;

    /** When a target was last in sight. 60 secs without one and the zombie lies down. */
    private lastTarget = dm.world.time;

    /** Set when a `Move` fails, so the next diagonal step takes the smaller-gap axis. See `stepDirection`. */
    private failed = false;

    /**
     * The two handler groups armed by `goToSleep`, held so they can be dropped again.
     */
    private sleepHandlers?: { inactive: HandlerGroup; wakeup: HandlerGroup };

    /**
     * The horizontal pixel offset claimed for the move currently being made. Reset to `0` as soon as the move is
     * over, so it is only meaningful inside `stepToward`.
     */
    private offsetTarget = 0;

    /**
     * The offset the mob's sprite is actually displaced by, which is what neighbours look at when they pick
     * their own. It survives between moves, unlike `offsetTarget`.
     *
     * The original script published this by writing it into the mob's `backpack` var, which is really the
     * player's chosen backpack type; `stackOnto` reads it out of the AI registry instead.
     */
    xOffset = 0;

    /**
     * `ref(mob)`, taken here while the mob is still valid.
     */
    private readonly ref: string;

    constructor(readonly mob: Byond.Mob.Living.Carbon.Human) {
        this.ref = ref(mob);

        table.insert(zombieAiList, this);
        zombieAiByRef[this.ref] = this;
        zombieAiCount += 1;
    }

    // #region Lifecycle

    setTarget(target: Byond.Atom | undefined) {
        this.target = target;
        this.processing = true;
    }

    /**
     * Wakes the zombie and points it at whatever just hit it, resetting the idle timer so it does not lie back
     * down mid-fight.
     */
    retaliate(target: Byond.Atom | undefined) {
        this.makeActive();
        this.lastTarget = dm.world.time;
        this.setTarget(target);
    }

    clearTarget() {
        this.target = undefined;
    }

    /** Drops the wakeup watchers armed by `goToSleep`. Safe to call when the zombie is not asleep. */
    private clearSleepHandlers() {
        if (!this.sleepHandlers) return;

        this.sleepHandlers.inactive.clear();
        this.sleepHandlers.wakeup.clear();
        this.sleepHandlers = undefined;
    }

    /** Wakes the zombie up and puts it back in the dispatch list. */
    makeActive() {
        this.processing = true;

        // every wake path comes through here, so this is where the watchers stop being needed
        this.clearSleepHandlers();

        if (!this.insideList) {
            table.insert(zombieAiList, this);
            this.insideList = true;
        }
    }

    /** Stops the zombie processing and takes it out of the dispatch list until something wakes it. */
    makeInactive() {
        this.processing = false;

        if (this.insideList) {
            for (const [index, other] of ipairs(zombieAiList)) {
                if (other === this) {
                    table.remove(zombieAiList, index);
                    break;
                }
            }
            this.insideList = false;
        }

        this.clearTarget();
    }

    /** Retires the AI for good. Called by `AiZombie.teardown` and when the mob stops being valid. */
    cleanup() {
        this.clearTarget();
        this.clearSleepHandlers();
        this.valid = false;
        this.processing = false;

        // @ts-expect-error assiging undefined deletes in lua
        zombieAiByRef[this.ref] = undefined;
        zombieAiCount -= 1;
    }

    /**
     * Keeps the mob's sprite nudged to `offsetTarget` as it moves. Registered by `AiZombie` on `movable_moved`,
     * which is why it is public.
     */
    updateOffset() {
        const xOffset = this.offsetTarget;

        if (xOffset !== 0 || this.xOffset !== 0) {
            animate(this.mob, { pixel_x: this.mob.pixel_x + xOffset - this.xOffset });
            this.xOffset = xOffset;
        }
    }

    // #endregion

    // #region Target acquisition

    /**
     * Looks for the nearest thing worth attacking within 10 tiles: whatever the controllers have rallied to
     * first, then anything audible in line of sight.
     */
    private findTarget(zombieLocation: Byond.Turf): Byond.Atom | undefined {
        let closestTarget: Byond.Atom | undefined;
        let closestDist = 1000;

        // A rally beats anything the zombie can find on its own, so it is checked first and never overridden.
        for (const [, target] of pairs(zombieControllerTargets)) {
            if (!SS13.is_valid(target)) continue;

            const location = SS13.get_turf(target);
            if (!location) continue;

            const distance = get_dist(zombieLocation, location);
            if (distance > 10) continue;

            if (distance < closestDist) {
                closestDist = distance;
                closestTarget = target;
            }
        }

        if (!closestTarget) {
            const potentialTargets = get_hearers_in_LOS(7, this.mob);

            if (potentialTargets) {
                for (const [, target] of potentialTargets) {
                    if (!isZombieTarget(target)) continue;
                    if (target.stat === 4) continue; // Dead

                    const location = SS13.get_turf(target);
                    if (!location) continue;

                    const distance = get_dist(zombieLocation, location);

                    if (distance < closestDist) {
                        closestDist = distance;
                        closestTarget = target;
                    }
                }
            }
        }

        return closestTarget;
    }

    /**
     * Lies the zombie down and arms the handlers that wake it again: one watching the tiles around it for a
     * victim, and one rebuilding those watchers whenever the body is dragged somewhere else.
     */
    private goToSleep() {
        this.mob.set_resting(true);

        const inactiveHandler = HandlerGroup.new();
        const wakeupTurfs = HandlerGroup.new();

        const createWakeupTurfs = () => {
            wakeupTurfs.clear();

            for (const [, turf] of rect_turfs(1, 1, this.mob)) {
                wakeupTurfs.register_signal(turf, "atom_entered", (_source, arrived) => {
                    if (!isZombieTarget(arrived)) return;
                    if (arrived.stat === 4) return; // Dead

                    this.lastTarget = dm.world.time;

                    // clears both groups, including the one this handler belongs to
                    this.makeActive();
                });
            }
        };

        inactiveHandler.register_signal(this.mob, "movable_moved", () => {
            // safety net for a wake that set `processing` without going through `makeActive`
            if (this.processing) {
                this.clearSleepHandlers();
                return;
            }

            createWakeupTurfs();
        });

        createWakeupTurfs();
        this.sleepHandlers = { inactive: inactiveHandler, wakeup: wakeupTurfs };
        this.makeInactive();
    }

    // #endregion

    // #region Movement

    /**
     * Collapses a diagonal into a single cardinal: normally the axis with the bigger gap, but the one with the
     * smaller gap on the step after a failed move, so a zombie that walked into a wall tries around it.
     */
    private stepDirection(zombieLocation: Byond.Turf, location: Byond.Turf): Byond.Direction {
        const targetDir = get_dir(zombieLocation, location);

        if (isCardinal(targetDir)) {
            return targetDir;
        }

        const xDiff = math.abs(location.x - zombieLocation.x);
        const yDiff = math.abs(location.y - zombieLocation.y);

        // NORTH|SOUTH is 3, EAST|WEST is 12, masking the diagonal keeps only one axis of it
        let preferVertical = xDiff < yDiff;

        if (this.failed) {
            this.failed = false;
            preferVertical = xDiff >= yDiff;
        }

        return _G.bit32.band(targetDir, preferVertical ? 3 : 12) as Byond.Direction;
    }

    /**
     * Lets the zombie share a tile with up to two others by dropping their density for the duration of the move,
     * and claims a free horizontal offset so the stack stays legible.
     *
     * @returns The densities to put back once the move is done.
     */
    private stackOnto(target: Byond.Turf): LuaMap<Byond.Atom.Movable, Byond.Bool> {
        const affected = new LuaMap<Byond.Atom.Movable, Byond.Bool>();
        const taken = new LuaSet<number>();

        let stackAmount = 0;

        for (const [, data] of target.contents) {
            if (!SS13.istype(data, "/mob/living/carbon/human") || !isZombieSpecies(data)) continue;

            affected.set(data, data.density);
            data.density = 0;
            stackAmount += 1;

            // reads the neighbour's current offset from its AI rather than from a var on the mob
            const other = getZombieAi(data);
            taken.add(other ? other.xOffset : 0);

            if (stackAmount >= 2) break;
        }

        for (const offset of offsets) {
            if (!taken.has(offset)) {
                this.offsetTarget = offset;
                break;
            }
        }

        return affected;
    }

    /**
     * Picks something to hit after a failed move. A crude barricade wins outright; otherwise anything dense,
     * preferring whatever blocks clicks on the rest of the tile (doors and full-tile windows), since hitting
     * anything behind those would not connect.
     */
    private findObstacle(target: Byond.Turf): Byond.Atom.Movable | undefined {
        let toClickOn: Byond.Atom.Movable | undefined;
        let priorityTarget: Byond.Atom.Movable | undefined;

        for (const [, data] of target.contents) {
            if (SS13.istype(data, "/mob/living/carbon/human") && isZombieSpecies(data)) continue;

            if (SS13.istype(data, "/obj/structure/barricade/wooden/crude")) {
                return data;
            }

            if (data.density === 1 && data !== this.mob) {
                toClickOn = data;

                // PREVENT_CLICK_UNDER_1 (1 << 3)
                if (!priorityTarget && _G.bit32.band(data.flags_1, 8) !== 0) {
                    priorityTarget = data;
                }
            }
        }

        return priorityTarget ?? toClickOn;
    }

    /**
     * Takes one step toward `location`, attacking whatever blocks the way.
     *
     * Runs inline: everything here up to the attack is synchronous, and the dispatch loop's budget check is what
     * keeps it inside the tick. Only the `ClickOn` at the end is deferred, because that one can sleep for as long
     * as an attack chain's `do_after` and blocking there would hold up every other zombie in the sweep.
     */
    private stepToward(zombieLocation: Byond.Turf, location: Byond.Turf, glidingSpeed: number) {
        // The original also had an A* pathfinder here (`getPath`, backed by a binary heap) but its call site was
        // commented out; only this greedy step ever ran. See `lua/zombieevent.lua`.
        const targetDir = this.stepDirection(zombieLocation, location);
        const target = get_step(this.mob, targetDir);

        if (!target) return;

        const affected = this.stackOnto(target);

        const moved = this.mob.Move(target, targetDir, glidingSpeed) === 1;

        this.offsetTarget = 0;

        for (const [zombie, previousDensity] of affected) {
            zombie.density = previousDensity;
        }

        if (moved) return;

        this.failed = true;

        const obstacle = this.findObstacle(target);

        if (obstacle) {
            this.mob.combat_mode = 1;

            invokeAsync(() => {
                if (SS13.is_valid(this.mob) && SS13.is_valid(obstacle)) this.mob.ClickOn(obstacle, "");
            });
        }
    }

    // #endregion

    /**
     * One AI tick for one zombie: get upright and unstuck, find something worth chasing, then hit it or step
     * toward it. Called by `startAiControllerLoop`, once per sweep.
     *
     * The early returns are a priority order, not just guards; being held, floored or stuck each rule out
     * everything below them, so moving them around changes behaviour.
     *
     * **This must not sleep**, which is what the tag below enforces. The dispatch loop bails out on the tick
     * budget rather than yielding precisely so that its body has no yield points: `timer.lua` re-arms the loop
     * before calling it, so a sleep anywhere in here would let the next firing start on top of a sweep already
     * in progress. A sleep would also stall every remaining zombie in that sweep behind this one.
     *
     * That is why the calls that genuinely block, `execute_resist` and `ClickOn`, go through `invokeAsync`
     * instead of being called directly. Everything else, movement included, runs here and now.
     *
     * @shouldnotsleep
     */
    execute() {
        if (!SS13.is_valid(this.mob)) {
            this.cleanup();
            return;
        }

        if (!this.processing || !this.valid) return;

        if (this.mob.stat !== 0) {
            // not Conscious
            this.processing = false;
            return;
        }

        const worldTime = dm.world.time;

        // Stuck in a locker or a bag: resist out of it before doing anything else.
        if (!SS13.istype(this.mob.loc, "/turf")) {
            invokeAsync(() => {
                if (SS13.is_valid(this.mob)) this.mob.execute_resist();
            });
            return;
        }

        const grabber = this.mob.pulledby;

        if (SS13.is_valid(grabber)) {
            this.retaliate(get_atom_on_turf(grabber));

            invokeAsync(() => {
                if (SS13.is_valid(this.mob)) this.mob.execute_resist();
            });
        }

        if (this.mob.body_position === 1 && worldTime >= this.nextGetup) {
            this.nextGetup = worldTime + 50;
            invokeAsync(() => {
                if (SS13.is_valid(this.mob)) {
                    this.mob.on_floored_end();
                    this.mob.set_resting(false);
                }
            });
        }

        if (has_trait(this.mob, "block_transformations") || has_trait(this.mob, "immobilized")) return;

        let closestTarget: Byond.Atom | undefined;
        const zombieLocation = SS13.get_turf(this.mob);

        if (!zombieLocation) return;

        if (worldTime >= this.nextTargetSearch) {
            this.nextTargetSearch = worldTime + 50;

            closestTarget = this.findTarget(zombieLocation);

            // a rallied tile stays the target until the rally expires, so only drop it when the search is dry
            if (!closestTarget && SS13.is_valid(this.target) && SS13.istype(this.target, "/turf")) {
                this.clearTarget();
            }
        }

        // a rallied turf is the target itself; anything else is resolved to whatever of it sits on the turf,
        // so a victim inside a locker resolves to the locker
        if (closestTarget && closestTarget !== this.target) {
            if (SS13.istype(closestTarget, "/turf")) {
                this.setTarget(closestTarget);
            } else if (SS13.istype(closestTarget, "/atom/movable")) {
                this.setTarget(get_atom_on_turf(closestTarget));
            }
        }

        const slowdown = this.mob.cached_multiplicative_slowdown;

        // `world.icon_size` is a number on any normal server, but BYOND also lets it be a `"[w]x[h]"` string —
        // tg's own `ICON_SIZE_ALL` define carries the warning that "more exotic coders will be sad if you use
        // this in math". Fall back to the 32 tg assumes rather than propagating a NaN into every glide.
        const iconSize = tonumber(dm.world.icon_size) ?? 32;

        const glidingSpeed = (iconSize / (slowdown / dm.world.tick_lag)) * dm.global_vars.GLOB.glide_size_multiplier;

        if (!SS13.is_valid(this.target)) {
            this.clearTarget();

            if (this.lastTarget + 600 <= worldTime) {
                this.goToSleep();
                return;
            }

            if (worldTime >= this.nextRandomWander) {
                this.nextRandomWander = worldTime + math.random(50, 100);

                const dir = pick(cardinals);
                const step = get_step(this.mob, dir);

                if (step) this.mob.Move(step, dir, glidingSpeed);
            }

            return;
        }

        this.lastTarget = worldTime;

        // stop chasing corpses, and never chase another zombie
        if (
            (SS13.istype(this.target, "/mob/living") && this.target.stat === 4) ||
            (SS13.istype(this.target, "/mob/living/carbon/human") && isZombieSpecies(this.target))
        ) {
            this.clearTarget();
            return;
        }

        const location = SS13.get_turf(this.target);

        if (!location) {
            this.clearTarget();
            return;
        }

        const distance = get_dist(zombieLocation, location);

        if (distance >= 10) {
            this.clearTarget();
            return;
        }

        if (distance > 1) {
            this.nextClickOn = worldTime + 10;
        }

        let clicked = false;
        const target = this.target;

        if ((distance !== -1 && distance <= 1) || zombieLocation === location) {
            if (worldTime >= this.nextClickOn && (this.mob.body_position !== 1 || this.crawler)) {
                if (target.IsReachableBy(this.mob) === 1) {
                    invokeAsync(() => {
                        if (SS13.is_valid(this.mob) && SS13.is_valid(target)) this.mob.ClickOn(target, "");
                    });
                    clicked = true;
                }
            }
        }

        if (worldTime >= this.nextPath) {
            this.nextPath = worldTime + this.mob.cached_multiplicative_slowdown;

            if (!clicked && (distance > 1 || !isZombieTarget(target))) {
                this.stepToward(zombieLocation, location, glidingSpeed);
            }
        }
    }
}

// #endregion

// #region Dispatch loop

/**
 * Starts the loop that drives every AI zombie, twice a second.
 *
 * Zombies are run inline against a tick budget; the calls that can genuinely sleep (`ClickOn`, `execute_resist`)
 * are the only ones still deferred, so one zombie stuck in a long attack chain cannot hold up the horde without
 * every zombie paying for a timer. Nothing in the body yields, so a firing can never overlap the previous one.
 *
 * Re-running the script starts a new loop and points `zombieAiLoop` at it. Older loops notice they are no longer
 * the current one and retire as soon as their own list has drained, so a re-run does not leave them piling up.
 */
export function startAiControllerLoop() {
    const currentRun: ZombieAi[] = [];
    let currentLoop: string;

    currentLoop = SS13.start_loop(0.5, -1, () => {
        if (zombieAiLoop !== currentLoop && zombieAiList.length === 0) {
            SS13.end_loop(currentLoop);
            return;
        }

        // Only start a new sweep once the previous one has drained, a sweep that ran out of tick budget is
        // picked up here where it left off.
        if (currentRun.length === 0) {
            // Walked backwards so removing an invalid entry does not skip the next one.
            //
            // Written as a `while` that decrements up front rather than a `for`: tstl compiles a `for` step into
            // the end of the loop body, which `continue` jumps straight past, the emitted Lua would never
            // terminate. The original Luau is shaped this way for the same reason.
            let i = zombieAiList.length + 1;

            while (i > 1) {
                i -= 1;

                const zombie = zombieAiList[i - 1];
                if (!zombie) continue;

                if (!zombie.valid) {
                    table.remove(zombieAiList, i);
                    continue;
                }

                if (zombie.processing) table.insert(currentRun, zombie);
            }
        }

        const tickStart = dm.world.time;

        while (currentRun.length > 0) {
            const zombie = table.remove(currentRun);

            if (zombie?.valid && zombie.processing) zombie.execute();

            if (tickLag(tickStart)) {
                print("can't keep up with zombie ai");
                return;
            }
        }
    });

    zombieAiLoop = currentLoop;
}

// #endregion
