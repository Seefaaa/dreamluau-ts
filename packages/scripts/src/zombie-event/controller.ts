/** @noSelfInFile */

import * as SS13 from "SS13";
import { grantAbility } from "../common/ability";
import { invokeAsync } from "../common/async";
import {
    add_trait,
    copytext,
    key_name_admin,
    message_admins,
    pick_list,
    ref,
    remove_trait,
    to_chat,
    trim,
} from "../common/globals";
import { icon } from "../common/web-loader";
import { getMutation } from "./globals";
import { getPlane, isZombieSpecies } from "./utils";

// #region Zombie Controller

/**
 * Collection of all zombie controllers in the game.
 */
export const zombieControllers: Byond.Mob.Eye[] = [];

/**
 * Mapping of zombie controller references to their current target.
 * This is used to track which target each controller has rallied their zombies towards.
 */
const zombieControllerTargets: Record<string, Byond.Atom> = {};

/**
 * Mapping of z-levels to lists of dead players at that z-level.
 */
const deadPlayersByZLevel = dm.global_vars.SSmobs.dead_players_by_zlevel;

/**
 * Emits a message to all zombie controllers, with a special format and sound effects.
 * @param controller The controller mob that is sending the message.
 * @param message The message to be sent to other controllers.
 * @param big Whether the message should be displayed in a larger format and play a sound effect.
 * @param nameOverride Optional override for the sender name displayed in the message.
 */
export function controllerSay(controller: Byond.Mob, message: string, big?: boolean, nameOverride?: string) {
    const trimmed = copytext(trim(message), 1, 1024);

    if (trimmed.length === 0) return;

    controller.log_talk(trimmed, 2);

    const renderedText = controller.generate_messagepart(trimmed);
    const senderName = nameOverride ?? tostring(controller);

    let rendered = `<span class='nicegreen'><b>[Controller Talk] ${senderName}</b> ${renderedText}</span>`;

    if (big) {
        for (const controller of zombieControllers) {
            controller.playsound_local(undefined, "sound/effects/glockenspiel_ping.ogg", 100);
        }
        rendered = `<span class='big'>${rendered}</span>`;
    }

    dm.global_procs.relay_to_list_and_observers(rendered, zombieControllers, controller);
}

/**
 * Creates a new zombie controller mob at the specified location, sets up its properties and abilities,
 * and registers necessary signals for its functionality. Does not assign the controller to a player,
 * @param location The turf location where the zombie controller will be spawned.
 * @returns The newly created zombie controller mob.
 */
export function makeZombieController(
    location: Byond.Turf,
    // lua cant resolve circular imports as good as ts can, so we have to pass this in as a parameter instead of importing it
    setClass: typeof import("./classes").ZombieClass.setClass
): Byond.Mob.Eye {
    // #region Controller Creation

    const controller = SS13.new("/mob/eye", location);
    controller.real_name = `Zombie Controller (${math.random(101, 999)})`;
    controller.name = controller.real_name;
    controller.invisibility = 60; // INVISIBILITY_OBSERVER (60)
    controller.see_invisible = 25; // SEE_INVISIBLE_LIVING (25)
    controller.layer = 5; // FLY_LAYER (5)
    controller.plane = getPlane(-3, location); // ABOVE_GAME_PLANE (-3)
    controller.set_faction(["zombie"]);
    controller.set_sight(60); // SEE_MOBS (4) | SEE_OBJS (8) | SEE_TURFS (16) | SEE_SELF (32)
    controller.mouse_opacity = 1; // MOUSE_OPACITY_ICON (1)
    controller.color = "#33cc33";
    controller.icon = icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/eyemob.dmi");
    controller.icon_state = "marker";
    controller.mind_initialize();

    add_trait(controller, "mute", "zs_controller");
    remove_trait(controller, "block_shuttle_movement", "innate"); // set in /Initialize

    const mind = assert(controller.mind);

    const antag = SS13.new("/datum/antagonist/custom");
    antag.name = "Controller";
    antag.show_to_ghosts = 1;
    antag.antagpanel_category = "Special Infected";
    antag.ui_name = undefined;

    const objective = SS13.new("/datum/objective");
    objective.owner = mind;
    objective.explanation_text = "Control the zombie hordes into the humans.";
    objective.completed = true;

    list.add(antag.objectives, objective);

    mind.add_antag_datum(antag);

    table.insert(zombieControllers, controller);

    // #endregion

    // #region On-Click (Ctrl) Rally Ability

    let nextRally = 0;
    let rallyTimer: string | undefined;
    const controllerRef = ref(controller);

    SS13.register_signal(controller, "mob_ctrl_clicked", (_, target) => {
        if (dm.world.time < nextRally) return 0;

        if (rallyTimer) SS13.end_loop(rallyTimer);

        zombieControllerTargets[controllerRef] = target;

        if (!SS13.istype(target, "/turf")) {
            to_chat(controller, `<span class='notice'>You rally nearby zombies to attack ${tostring(target)}</span>`);
            rallyTimer = SS13.start_loop(30, 1, () => {
                // @ts-expect-error assiging undefined deletes in lua
                zombieControllerTargets[controllerRef] = undefined;
            });
        } else {
            to_chat(controller, "<span class='notice'>You rally nearby zombies to the targeted location</span>");
            rallyTimer = SS13.start_loop(10, 1, () => {
                // @ts-expect-error assiging undefined deletes in lua
                zombieControllerTargets[controllerRef] = undefined;
            });
        }

        const potentialTargets = dm.global_procs.get_hearers_in_range(10, controller);
        if (!potentialTargets) return 0;

        for (const [, zombie] of list.filter(potentialTargets, "/mob/living/carbon/human")) {
            if (!isZombieSpecies(zombie)) continue;

            const mutation = getMutation(zombie);

            if (!mutation || mutation.class !== "Zombie (AI)") continue;

            if (mutation.zombieAi !== undefined) {
                mutation.zombieAi.nextTargetSearch = 0;
                mutation.zombieAi.lastTarget = dm.world.time;
                mutation.zombieAi.makeActive();
            }
        }

        nextRally = dm.world.time + 30;

        return 0;
    });

    // #endregion

    // #region SSmobs.dead_players_by_zlevel syncronization

    // /mob/eye is not inserted there automatically. Register its starting Z
    // immediately, then keep the list in sync when it flies between Z levels.

    let oldZ = controller.z;

    if (oldZ !== undefined) {
        const zList = deadPlayersByZLevel.get(oldZ);
        if (zList) list.add(zList, controller);
    }

    SS13.register_signal(controller, "mob_client_move_possessed_object", (source, new_loc, _direct) => {
        const newZ = new_loc.z;
        if (newZ !== oldZ) {
            if (oldZ !== undefined) {
                const oldZList = deadPlayersByZLevel.get(oldZ);
                if (oldZList) list.remove(oldZList, source);
            }
            if (newZ !== undefined) {
                const newZList = deadPlayersByZLevel.get(newZ);
                if (newZList) list.add(newZList, source);
            }
            oldZ = newZ;
        }
        source.abstract_move(new_loc);
        return 1;
    });

    // #endregion

    // #region Cleanup on Deletion

    SS13.register_signal(controller, "parent_qdeleting", (_source, _force) => {
        if (oldZ !== undefined) {
            const zList = deadPlayersByZLevel.get(oldZ);
            if (zList) list.remove(zList, controller);
        }

        // @ts-expect-error assiging undefined deletes in lua
        zombieControllerTargets[controllerRef] = undefined;

        if (rallyTimer) SS13.end_loop(rallyTimer);

        for (const [i, zombie] of ipairs(zombieControllers)) {
            if (zombie === controller) {
                table.remove(zombieControllers, i);
                break;
            }
        }
    });

    // #endregion

    // #region Abilities

    // #region Send Message Ability

    let isUiOpen = false;

    /**
     * Grants the "Send Message To Other Controllers" ability to the zombie controller.
     * This ability allows the controller to send a message to all other zombie controllers in the game.
     */
    grantAbility(controller, undefined, {
        name: "Send Message To Other Controllers",
        icon: icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/actions/actions_xeno.dmi"),
        icon_state: "alien_whisper",
        abilityType: "normal",
        cooldown: 0,
        onActivate: (_context, _action, _target) => {
            if (isUiOpen) return 1;

            invokeAsync(() => {
                isUiOpen = true;

                const [message] = SS13.await(
                    SS13.global_proc,
                    "tgui_input_text",
                    controller,
                    "Send message to controllers",
                    "Message controllers"
                );

                isUiOpen = false;

                if (message) controllerSay(controller, message);
            });

            return 0;
        },
    });

    // #endregion

    // #region Promote Tank Ability

    /** The mob that has been promoted to a tank */
    let promotedTank: Byond.Mob | undefined;
    /** Ability cooldown in seconds (15 minutes) */
    const cooldown = 900;

    /**
     * Grants the "Promote Tank" ability to the zombie controller. This ability allows the controller to promote a AI zombie to a player controlled
     * tank for 60 seconds, giving them time to breach into the defenses of a department. The ability has a cooldown of 15 minutes. When the time is up,
     * the promoted tank will revert back to a less powerful zombie class.
     */
    grantAbility(controller, undefined, {
        name: "Promote Tank",
        desc: "Promote someone to a tank for 60 seconds, giving them time to breach into the defenses of a department. Has a 15 minute cooldown.",
        icon: icon(
            "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/zombie.dmi"
        ),
        icon_state: "tank",
        abilityType: "targeted",
        pointerIcon: icon(
            "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/effects/mouse_pointers/cult_target.dmi"
        ),
        cooldown: cooldown,
        onActivate: (_context, action, target) => {
            if (!allowTankSpawn) {
                controller.balloon_alert(controller, "tank spawn disabled");
                return 1;
            }

            if (SS13.is_valid(promotedTank) && promotedTank.stat !== 4) {
                controller.balloon_alert(controller, "promoted tank still alive!");
                return 1;
            }

            if (!SS13.istype(target, "/mob/living/carbon/human")) {
                controller.balloon_alert(controller, "invalid target");
                return 1;
            }

            const mutation = getMutation(target);

            if (!mutation || mutation.class !== "Zombie (AI)") {
                controller.balloon_alert(controller, "invalid target");
                return 1;
            }

            invokeAsync(() => {
                const [text] = SS13.await(
                    SS13.global_proc,
                    "tgui_input_text",
                    controller,
                    "Please input an objective for this tank",
                    "Tank objective"
                );

                if (!text) return;

                const objective = dm.global_procs.sanitize(text);

                setClass(mutation, "Tank");

                const [candidates] = SS13.await(
                    dm.global_vars.SSpolling,
                    "poll_ghost_candidates",
                    `The mode is looking for volunteers to become a Tank to do the following: ${objective}`,
                    undefined,
                    undefined,
                    100, // 10 secs
                    undefined,
                    true,
                    target,
                    target,
                    "Tank Zombie"
                );

                if (!SS13.is_valid(target)) {
                    if (SS13.is_valid(action)) action.StartCooldownSelf(1);
                    return;
                }

                let chosen: Byond.Mob | undefined;

                if (candidates === undefined) {
                } else if (SS13.istype(candidates, "/mob")) chosen = candidates;
                else chosen = pick_list(candidates);

                if (!SS13.is_valid(chosen)) {
                    message_admins("Not enough players volunteered for the Tank role.");
                    to_chat(
                        controller,
                        "<span class='warning'>Not enough players volunteered for the Tank role.</span>"
                    );
                    setClass(mutation, "Zombie (AI)");
                    if (SS13.is_valid(action)) action.StartCooldownSelf(1);
                    return;
                }

                message_admins(`Selected ${key_name_admin(chosen)} for the role of tank.`);

                const zombieMind = SS13.new("/datum/mind", chosen.key);
                zombieMind.transfer_to(target, true);
                promotedTank = target;

                action.StartCooldownSelf(cooldown * 10);

                to_chat(
                    promotedTank,
                    `<span class='userdanger'>Your goal is to do the following: ${objective}. You have 60 seconds to do it</span>`
                );

                SS13.set_timeout(60, () => {
                    if (SS13.is_valid(promotedTank) && promotedTank.stat !== 4) {
                        to_chat(promotedTank, "<span class='userdanger'>Times up!</span>");
                        setClass(mutation, pick_list(["Boomer", "Jockey", "Smoker"] as const));
                    }
                });
            });

            return 0;
        },
    });

    // #endregion

    // #endregion

    return controller;
}

// #endregion
