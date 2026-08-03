/** @noSelfInFile */

import * as SS13 from "SS13";
import * as HandlerGroup from "handler_group";
import { invokeAsync } from "../common/async";
import {
    add_trait,
    do_sparks,
    has_trait,
    key_name_admin,
    message_admins,
    pick_list,
    ref,
    remove_trait,
} from "../common/globals";
import { getReadablePerfStat, sleepingAt, timeAvg, totalCallCount, totalTimeTaken } from "../common/perf";
import { isAdmin } from "../common/utils";
import { ZombieClass, zombieClasses } from "./classes";
import { controllerSay } from "./controller";
import { createHref, isZombieSpecies } from "./utils";

export type MutationData = {
    mob: Byond.Mob.Living.Carbon.Human;
    class?: keyof typeof zombieClasses;

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
    if (existingMutation) ZombieClass.setClass(existingMutation, undefined);

    const mutation: MutationData = {
        mob: human,
        class: "Non-Zombie",
        cleanup: [],
    };

    if (isLocal && human.ckey === runner) {
        ZombieClass.setClass(mutation, localClass);
    } else {
        if (isZombieSpecies(human)) ZombieClass.setClass(mutation, "Zombie");
        else ZombieClass.setClass(mutation, "Non-Zombie");
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
                ZombieClass.setClass(mutation, "Zombie (AI)");
                return;
            }

            ZombieClass.setClass(mutation, "Zombie");

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
                    ZombieClass.setClass(mutation, "Zombie (AI)");
                }
            });
        }
    });

    // setClass without set_timeout 0 might cause problems if setClass is sleeping
    SS13.register_signal(human, "species_loss", (_source, species) => {
        if (SS13.istype(species, "/datum/species/zombie/infectious")) {
            ZombieClass.setClass(mutation, "Non-Zombie");
        }
    });

    // this is problematic
    SS13.register_signal(human, "parent_preqdeleted", () => {
        ZombieClass.setClass(mutation, undefined);
        // @ts-expect-error assiging undefined deletes in lua
        allMutations[humanRef] = undefined;
    });

    SS13.register_signal(human, "handle_topic", (_source, user, hrefList) => {
        if (!isAdmin(user)) return;

        invokeAsync(() => {
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

                ZombieClass.setClass(mutation, "Zombie (AI)");
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
                    let className: keyof typeof zombieClasses = "Zombie (AI)";

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

                    ZombieClass.setClass(mutation, className);

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

                    invokeAsync(() => {
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

                ZombieClass.setClass(mutation, choice as keyof typeof zombieClasses);
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
