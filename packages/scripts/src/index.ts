/** @noSelfInFile */

/** biome-ignore-all lint/correctness/noUnusedVariables: wip */

// import * as HandlerGroup from "handler_group";
import * as SS13 from "SS13";
import { icon, sounds } from "./loader";

const isLocal = false;
const admin = "hatods";
const localClass = "Zombie (AI)";
const allowZombieControllable = false;
const allowTankSpawn = false;
const isSpawning = false;

SS13.state.supress_runtimes = true;

function tickLag(_tickUsageStart: number, worldTime: number): boolean {
    if (dm.world.time !== worldTime) {
        print("We slept somewhere!");
        return true;
    }
    return _exec.time / (dm.world.tick_lag * 100) > 0.85;
}

if (!isLocal) {
    // check later

    const SSfastprocess = dm.global_vars.SSfastprocess;
    SSfastprocess.priority = 90;
    SSfastprocess.flags = SSfastprocess.flags & ~4;

    const SSlua = dm.global_vars.SSlua;
    SSlua.priority = 110;
}

const maxPathfindingRange = 15;

let lastTimeTaken = os.clock();
let worldTime = dm.world.time;
const timeAvg: Record<number, number> = {};
const sleepingAt: Record<number, boolean> = {};
const totalTimeTaken: Record<number, number> = {};
const totalCallCount: Record<number, number> = {};

let startPerfTrack = () => {
    const [line] = debug.info(2, "l");

    lastTimeTaken = os.clock();
    worldTime = dm.world.time;

    timeAvg[line] = 0;
    totalTimeTaken[line] = 0;
    totalCallCount[line] = (totalCallCount[line] ?? 0) + 1;
};

// function isTypeLite(thing: Byond.Datum, type: string): boolean {
//     switch (type) {
//         case "/datum":
//         case "/atom":
//         case "/atom/movable":
//             return SS13.istype(thing, type) === 1;
//         default: {
//             const datumType = tostring(thing.type);
//             return string.find(datumType, type) !== undefined;
//         }
//     }
// }

let checkPerf = (ignoreSleep: boolean = false) => {
    const [line] = debug.info(2, "l");

    if (worldTime !== dm.world.time) {
        if (ignoreSleep) {
            return;
        }
        sleepingAt[line] = true;
        worldTime = dm.world.time;
    }

    const currentTime = os.clock();
    const currentDiff = currentTime - lastTimeTaken;
    const prevDiff = timeAvg[line] ?? currentDiff;

    timeAvg[line] = 0.8 * prevDiff + 0.2 * currentDiff;
    totalTimeTaken[line] = (totalTimeTaken[line] ?? 0) + currentDiff;
    totalCallCount[line] = (totalCallCount[line] ?? 0) + 1;

    lastTimeTaken = currentTime;
};

// Uncomment if not perf tracking to not have any perf loss
startPerfTrack = () => {};
checkPerf = () => {};

sleep();

const cardinals = [1, 2, 4, 8];

const blockActivation = 1;

function getPlane(newPlane: number, zReference: Byond.Atom): number {
    const SSmapping = dm.global_vars.SSmapping;

    if (SSmapping.max_plane_offset !== 0) {
        let turfPlaneOffsets = 0;

        if (SSmapping.max_plane_offset !== undefined && SS13.istype(zReference, "/atom")) {
            if (zReference.z !== undefined) {
                turfPlaneOffsets = SSmapping.z_level_to_plane_offset[zReference.z] ?? 0;
            } else {
                if (SSmapping.plane_to_offset !== undefined) {
                    turfPlaneOffsets = SSmapping.plane_to_offset[tostring(zReference.plane)] ?? 0;
                } else {
                    turfPlaneOffsets = zReference.plane;
                }
            }
        }

        const planeOffsetBlacklist = SSmapping.plane_offset_blacklist;

        if (planeOffsetBlacklist === undefined || planeOffsetBlacklist[tostring(newPlane)]) {
            return newPlane;
        } else {
            return newPlane - 100 * turfPlaneOffsets;
        }
    } else {
        return newPlane;
    }
}

function ref(thing: Byond.Datum): string {
    return dm.global_procs.REF(thing);
}

declare var allHumanData: Record<string, HumanData>;
allHumanData = allHumanData ?? {};

function getZombieMutation(human: Byond.Atom) {
    return allHumanData[ref(human)];
}

function hasTrait(target: Byond.Datum, trait: string) {
    return dm.global_procs._has_trait(target, trait) === 1;
}

function isZombie(human: Byond.Atom) {
    if (!SS13.istype(human, "/mob/living/carbon/human")) {
        return false;
    }

    const dna = human.dna;

    if (dna === undefined) {
        return false;
    }

    return SS13.istype(dna.species, "/datum/species/zombie/infectious");
}

function infectTarget(human: Byond.Mob.Living.Carbon.Human, defType: string) {
    let infection = human.get_organ_slot("zombie_infection");

    if (SS13.is_valid(infection) === 1) {
        return;
    }

    if (defType !== "bypass") {
        const armor = human.getarmor(defType, "bio");
        if (dm.global_procs._prob(armor) === 1) {
            return;
        }
    }

    infection = SS13.new("/obj/item/organ/internal/zombie_infection");
    infection.Insert(human);
}

const tankFootstepSound = sounds([
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/footstep1.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/footstep2.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/footstep3.ogg",
]);

const tankDeathSound = sounds([
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/death1.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/death2.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/death3.ogg",
]);

const tankRoarSounds = sounds([
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/roar1.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/roar2.ogg",
    "https://raw.githubusercontent.com/tgstation/auxlua-cookbook/master/waltermeldron/assets/zombie/roar3.ogg",
]);

function locate(x: number, y: number, z: number): Byond.Turf {
    return dm.global_procs._locate(x, y, z);
}

function rangeTurfs(location: Byond.Atom, radius: number): Byond.List<number, Byond.Turf> {
    const x = location.x;
    const y = location.y;
    const z = location.z;
    return dm.global_procs._block(locate(x - radius, y - radius, z), locate(x + radius, y + radius, z));
}

function to_chat(user: Byond.Datum, message: string) {
    dm.global_procs.to_chat(user, message);
}

type HumanData = {
    human: Byond.Mob.Living.Carbon.Human;
    class: string;
    classCleanup: {
        target: Byond.Datum;
        signal: string;
        callback?: (...args: any[]) => any;
    }[];
    zombieAi?: {
        nextTargetSearch: number;
        lastTarget: number;
        makeActive: (this: NonNullable<HumanData["zombieAi"]>) => void;
    };
};

function RegisterClassSignal(humanData: HumanData, signal: keyof SignalRegistry, callback: (...args: any[]) => any) {
    SS13.register_signal(humanData.human, signal, callback);
    humanData.classCleanup.push({
        target: humanData.human,
        signal,
        callback,
    });
}
function RegisterClassSignal2(
    humanData: HumanData,
    target: Byond.Datum,
    signal: keyof SignalRegistry,
    callback: (...args: any[]) => any
) {
    SS13.register_signal(target, signal, callback);
    humanData.classCleanup.push({
        target,
        signal,
        callback,
    });
}

type AbilityData = {
    abilityType: "targeted";
    icon: string;
    icon_state: string;
    name: string;
    desc?: string;
    cooldown?: number; // in secs
    onActivate: (
        this: void,
        humanData: HumanData,
        action: Byond.Datum.Action.Cooldown,
        target: Byond.Datum
    ) => Bitflag<[ComponentBlockAbilityStart]>;
};

function grantAbility(humanData: HumanData, abilityData: AbilityData) {
    const action = SS13.new("/datum/action/cooldown");

    const abilityType = abilityData.abilityType;

    if (abilityType === "targeted") {
        action.click_to_activate = 1;
        action.unset_after_click = 1;
        action.ranged_mousepointer = icon(
            "https://raw.githubusercontent.com/tgstation/tgstation/master/icons/effects/mouse_pointers/cult_target.dmi"
        );
    }

    action.button_icon = icon(abilityData.icon);
    action.button_icon_state = abilityData.icon_state;
    action.background_icon_state = "bg_heretic";
    action.overlay_icon_state = "bg_hereic_border";
    action.active_overlay_icon_state = "bg_nature_border";
    action.cooldown_time = (abilityData.cooldown ?? 0) * 10;

    SS13.register_signal(humanData.human, "mob_ability_base_started", (source, actionTarget, target) => {
        if (ref(actionTarget) === ref(action)) {
            const returnValue = abilityData.onActivate(humanData, action, target);
            if (action.unset_after_click === 1) {
                action.unset_click_ability(source, 0);
            }
            source.next_click = dm.world.time + action.click_cd_override;
            return returnValue;
        }
        return 0;
    });

    action.name = abilityData.name;

    if (abilityData.desc) {
        action.desc = abilityData.desc;
    }

    action.Grant(humanData.human);

    return action;
}

const zombieControllerTargets: Record<string, Byond.Atom> = {};
const zombieControllers: Byond.Mob[] = [];

function sayText(player: Byond.Mob, chatName: string, message: string, big: boolean) {
    message = dm.global_procs._copytext(dm.global_procs.trim(message), 1, 1024);
    player.log_talk(message, 2);
    const renderedText = player.generate_messagepart(message);
    let rendered = `<span class='nicegreen'><b>[Controller Talk] ${chatName}</b> ${renderedText}</span>`;
    if (big) {
        rendered = `<span class='big'>${rendered}</span>`;
        for (const player of zombieControllers) {
            // biome-ignore lint/style/noNonNullAssertion: just this once
            player.playsound_local(player.loc!, "sound/effects/glockenspiel_ping.ogg", 100);
        }
    }
    dm.global_procs.relay_to_list_and_observers(rendered, zombieControllers, player);
}

const deadPlayersByZLevel = dm.global_vars.SSmobs.dead_players_by_zlevel;
const SSspatial_grid = dm.global_vars.SSspatial_grid;

function makeZombieController(location: Byond.Turf) {
    const controller = SS13.new("/mob/eye", location);
    const controllerData = { mob: controller };
    controller.real_name = `Zombie Controller (${math.random(101, 999)})`;
    controller.name = controller.real_name;
    controller.invisibility = 35;
    controller.see_invisible = 35;
    controller.layer = 5;
    controller.plane = getPlane(-3, location);
    controller.faction = list.from_table(["zombie"]);
    controller.set_sight(60);
    controller.mouse_opacity = 1;
    controller.color = "#33cc33";
    controller.icon = icon("https://raw.githubusercontent.com/tgstation/tgstation/master/icons/mob/eyemob.dmi");
    controller.icon_state = "marker";
    // controller.lightning_cutoff_red = 5
    // controller.lightning_cutoff_green = 35
    // controller.lightning_cutoff_blue = 20
    controller.mind_initialize();

    const mind = assert(controller.mind);

    const antag = SS13.new("/datum/antagonist/custom");
    antag.name = "Controller";
    antag.show_to_ghosts = 1;
    antag.antagpanel_category = "Special Infected";
    antag.ui_name = undefined;

    const objective = SS13.new("/datum/objective");
    objective.owner = mind;
    objective.explanation_text = "Control the zombie hordes into the humans.";
    objective.completed = 1;
    list.add(antag.objectives, objective);

    mind.add_antag_datum(antag);

    dm.global_procs._add_trait(controller, "mute", "zs_controller");

    zombieControllers.push(controller);

    const nextRally = 0;
    let rallyTimer: string | undefined;
    const controllerRef = ref(controller);

    SS13.register_signal(controller, "mob_ctrl_clicked", (_, target) => {
        if (rallyTimer) {
            SS13.end_loop(rallyTimer);
        }

        zombieControllerTargets[controllerRef] = target;

        if (!SS13.istype(target, "/turf")) {
            to_chat(controller, `<span class='notice'>You rally nearby zombies to attack ${tostring(target)}</span>`);
            rallyTimer = SS13.start_loop(30, 1, () => {
                delete zombieControllerTargets[controllerRef];
            });
        } else {
            to_chat(controller, "<span class='notice'>You rally nearby zombies to the targeted location</span>");
            rallyTimer = SS13.start_loop(10, 1, () => {
                delete zombieControllerTargets[controllerRef];
            });
        }

        const potentialTargets = dm.global_procs.get_hearers_in_range(10, controller);

        for (const zombie of potentialTargets) {
            if (!isZombie(zombie)) {
                continue;
            }

            const mutationData = getZombieMutation(zombie);

            if (mutationData?.class !== "Zombie (AI)") {
                continue;
            }

            if (mutationData.zombieAi !== undefined) {
                mutationData.zombieAi.nextTargetSearch = 0;
                mutationData.zombieAi.lastTarget = dm.world.time;
                mutationData.zombieAi.makeActive();
            }
        }

        return 0;
    });

    const oldZ = controller.z;

    if (oldZ !== undefined && deadPlayersByZLevel[oldZ] !== undefined) {
        list.add(deadPlayersByZLevel[oldZ], controller);
    }
}
