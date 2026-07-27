/** @noSelfInFile */

/// <reference path="../../index.d.ts" />
/// <reference path="ss13_base.d.ts" />

/**
 * @noResolution
 */
declare module "SS13" {
    export * from "SS13_base";
    export {
        end_loop,
        set_timeout,
        start_loop,
        stop_all_loops,
        wait,
    } from "timer";
}

declare namespace SS13 {
    class Subsystem extends Byond.Datum {
        priority: number;
        flags: number;
    }

    class SSfastprocess extends Subsystem {}

    class SSlua extends Subsystem {}

    class SSmapping extends Subsystem {
        max_plane_offset: number;
        z_level_to_plane_offset: Record<number, number>;
        plane_to_offset: Record<string, number>;
        plane_offset_blacklist: Record<string, unknown>;
    }

    class SSmobs extends Subsystem {
        dead_players_by_zlevel: Byond.List<
            number,
            Byond.List<number, Byond.Mob>
        >;
    }

    class SSspatial_grid extends Subsystem {}
}

declare namespace Byond {
    namespace Datum {
        class Dna extends Byond.Datum {
            species: Byond.Datum.Species;
        }

        class Species extends Byond.Datum {}

        class HttpRequest extends Byond.Datum {
            prepare(
                this: Byond.Datum.HttpRequest,
                method: "get" | "post",
                url: string,
                body: string,
                headers: string,
                output: string,
            ): void;

            begin_async(): void;

            is_complete(): Byond.Bool;
        }

        class Hud extends Byond.Datum {}

        class Preference extends Byond.Datum {}

        namespace Preference {
            class Numeric extends Byond.Datum.Preference {}

            namespace Numeric {
                class Volume extends Byond.Datum.Preference.Numeric {}
            }
        }

        class Action extends Byond.Datum {
            /** The name of the action */
            name: string;
            /** The description of what the action does, shown in button tooltips */
            desc: string | undefined;
            /**
             * The target the action is attached to. If the target datum is deleted, the action is as well.
             *
             * Set in New() via the proc link_to(). PLEASE set a target if you're making an action
             */
            target: Byond.Datum | undefined;
            /** Where any buttons we create should be by default. Accepts screen_loc and location defines */
            default_button_position:
                | "default"
                | "floating"
                | "list"
                | "palette"
                | "first";
            /**
             * This is who currently owns the action, and most often, this is who is using the action if it is triggered
             *
             * This can be the same as "target" but is not ALWAYS the same - this is set and unset with Grant() and Remove()
             */
            owner: Byond.Mob | undefined;
            /** If False, the owner of this action does not get a hud and cannot activate it on their own */
            owner_has_control: Byond.Bool;
            /** Flags that will determine of the owner / user of the action can... use the action */
            check_flags: number;
            /** Whether the button becomes transparent when it can't be used, or just reddened */
            transparent_when_unavailable: Byond.Bool;
            /** List of all mobs that are viewing our action button -> A unique movable for them to view. */
            viewers: Byond.List<Byond.Datum.Hud, Byond.Atom.Movable>;
            /** If TRUE, this action button will be shown to observers / other mobs who view from this action's owner's eyes. */
            show_to_observers: Byond.Bool;
            /** If observers can click this action at any time, regardless of the owner */
            allow_observer_click: Byond.Bool;
            /** The style the button's tooltips appear to be */
            buttontooltipstyle: string;
            /** This is the file for the BACKGROUND underlay icon of the button */
            background_icon: Byond.Icon;
            /**
             * This is the icon state state for the BACKGROUND underlay icon of the button
             * (If set to ACTION_BUTTON_DEFAULT_BACKGROUND, uses the hud's default background)
             */
            background_icon_state: string;
            /** This is the file for the icon that appears on the button */
            button_icon: Byond.Icon;
            /** This is the icon state for the icon that appears on the button */
            button_icon_state: string;
            /** This is the file for any FOREGROUND overlay icons on the button (such as borders) */
            overlay_icon: Byond.Icon;
            /** This is the icon state for any FOREGROUND overlay icons on the button (such as borders) */
            overlay_icon_state: string | undefined;
            /** full key we are bound to */
            full_key: string | undefined;
            /** Toggles whether this action is usable or not */
            action_disabled: Byond.Bool;
            /** Can this action be shared with our rider? */
            can_be_shared: Byond.Bool;

            /** Grants the action to the passed mob, making it the owner */
            Grant(this: Byond.Datum.Action, grant_to: Byond.Mob): void;

            /** Remove the passed mob from being owner of our action */
            Remove(this: Byond.Datum.Action, remove_from: Byond.Mob): void;
        }

        namespace Action {
            /** Preset for an action that has a cooldown. */
            class Cooldown extends Byond.Datum.Action {
                /** The actual next time this ability can be used */
                next_use_time: number;
                /** The default cooldown applied when StartCooldown() is called */
                cooldown_time: number;
                /** The default melee cooldown applied after the ability ends. If set to null, copies cooldown_time. */
                melee_cooldown_time: number;
                /** The actual next time the owner of this action can melee */
                next_melee_use_time: number;
                /** Whether or not you want the cooldown for the ability to display in text form */
                text_cooldown: Byond.Bool;
                /** Significant figures to round cooldown to */
                cooldown_rounding: number;
                /** Shares cooldowns with other abiliies, bitflag */
                shared_cooldown: number;
                /** List of prerequisite actions that are used in this sequenced ability, you cannot put other sequenced abilities in this */
                sequence_actions: Byond.List<Byond.Type, number>;
                /** List of prerequisite actions that have been initialized */
                initialized_actions: Byond.List<
                    Byond.Datum.Action.Cooldown,
                    number
                >;

                /** Setting for intercepting clicks before activating the ability */
                click_to_activate: Byond.Bool;
                /** The cooldown added onto the user's next click. */
                click_cd_override: number;
                /** If TRUE, we will unset after using our click intercept. */
                unset_after_click: Byond.Bool;
                /** What icon to replace our mouse cursor with when active. Optional */
                ranged_mousepointer: Byond.Icon | undefined;
                /** The base icon_state of this action's background */
                base_background_icon_state: string | undefined;
                /** The icon state the background uses when active */
                active_background_icon_state: string | undefined;
                /** The base icon_state of the overlay we apply */
                base_overlay_icon_state: string | undefined;
                /** The active icon_state of the overlay we apply */
                active_overlay_icon_state: string | undefined;
                /** The base icon state of the spell's button icon, used for editing the icon "off" */
                base_icon_state: string | undefined;
                /** The active icon state of the spell's button icon, used for editing the icon "on" */
                active_icon_state: string | undefined;

                /**
                 * Unset our action as the click override of the passed mob.
                 *
                 * if refund_cooldown is TRUE, we are being unset by the user clicking the action off
                 * if refund_cooldown is FALSE, we are being forcefully unset, likely by someone actually using the action
                 */
                unset_click_ability(
                    this: Byond.Datum.Action.Cooldown,
                    on_who: Byond.Mob,
                    refund_cooldown?: Byond.Bool,
                ): void;
            }
        }

        class Antagonist extends Byond.Datum {
            /** Public name for this antagonist. Appears for player prompts and round-end reports. */
            name: string;
            /** Should this antagonist be shown as antag to ghosts? Shouldn't be used for stealthy antagonists like traitors */
            show_to_ghosts: Byond.Bool;
            /** Antagpanel will display these together, REQUIRED */
            antagpanel_category: string;
            /** name of the UI that will try to open, right now using a generic ui */
            ui_name: string | undefined;
            /** List of the objective datums that this role currently has, completing all objectives at round-end will cause this antagonist to greentext. */
            objectives: Byond.List<number, Byond.Datum.Objective>;
        }

        namespace Antagonist {
            class Custom extends Byond.Datum.Antagonist {}
        }

        class Objective extends Byond.Datum {
            /** The primary owner of the objective. !!SOMEWHAT DEPRECATED!! Prefer using 'team' for new code. */
            owner: Byond.Datum.Mind | undefined;
            /** An alternative to 'owner': a team. Use this when writing new code. */
            team: Byond.Datum.Team | undefined;
            /** Name for admin prompts */
            name: string;
            /** What that person is supposed to do. */
            explanation_text: string;
            /** If this objective doesn't print failure or success in the roundend report */
            no_failure: Byond.Bool;
            /** name used in printing this objective (Objective #1) */
            objective_name: string;
            /** For when there are multiple owners. */
            team_explanation_text: string | undefined;
            /** If they are focused on a particular person. */
            target: Byond.Datum.Mind | undefined;
            /** If they are focused on a particular number. Steal objectives have their own counter. */
            target_amount: number;
            /** currently only used for custom objectives. */
            completed: Byond.Bool;
            /** If the objective is compatible with martyr objective, i.e. if you can still do it while dead. */
            martyr_compatible: Byond.Bool;
            /** can this be granted by admins? */
            admin_grantable: Byond.Bool;
        }

        class Mind extends Byond.Datum {
            add_antag_datum(
                this: Byond.Datum.Mind,
                antag:
                    | Byond.Type<Byond.Datum.Antagonist>
                    | Byond.Datum.Antagonist,
                team?: Byond.Datum.Team,
            ): void;
        }

        class Team extends Byond.Datum {}
    }

    interface Mob {
        /** What is the mobs real name (name is overridden for disguises etc) */
        real_name: string;

        /**
         * 1 decisecond click delay (above and beyond mob/next_move)
         *
         * This is mainly modified by click code, to modify click delays elsewhere, use next_move and changeNext_move()
         */
        next_click: number;

        mind: Byond.Datum.Mind | undefined;

        get_organ_slot(
            this: Byond.Mob,
            slot: string,
        ): Byond.Obj.Item.Organ | undefined;

        /**
         * Plays a sound with a specific point of origin for src mob
         *
         * Affected by pressure, distance, terrain and environment (see arguments)
         *
         * Arguments:
         * * turf_source - The turf our sound originates from, if this is not a turf, the sound is played with no spatial audio
         * * soundin - Either a file, or a string that can be used to get an SFX.
         * * vol - The volume of the sound, excluding falloff and pressure affection.
         * * vary - bool that determines if the sound changes pitch every time it plays.
         * * frequency - playback speed of audio.
         * * falloff_exponent - Rate of falloff for the audio. Higher means quicker drop to low volume. Should generally be over 1 to indicate a quick dive to 0 rather than a slow dive.
         * * channel - Optional: The channel the sound is played at.
         * * pressure_affected - bool Whether or not difference in pressure affects the sound (E.g. if you can hear in space).
         * * sound_to_use - Optional: Will default to soundin when absent
         * * max_distance - number, determines the maximum distance of our sound
         * * falloff_distance - Distance at which falloff begins. Sound is at peak volume (in regards to falloff) aslong as it is in this range.
         * * distance_multiplier - Default 1, multiplies the maximum distance of our sound
         * * use_reverb - bool default TRUE, determines if our sound has reverb
         * * volume_preference - Optional: Will be checked to modify the volume of the sound.
         * * min_volume - minimum volume the sound can reach at max_range.
         */
        playsound_local(
            this: Byond.Mob,
            turf_source: Byond.Turf,
            soundin: Byond.Sound | string,
            vol: number,
            vary?: Byond.Bool,
            extrarange?: number,
            falloff_exponent?: number,
            frequency?: number,
            channel?: number,
            pressure_affected?: Byond.Bool,
            ignore_walls?: Byond.Bool,
            falloff_distance?: number,
            use_reverb?: Byond.Bool,
            volume_preference?: Byond.Datum.Preference.Numeric.Volume,
            min_volume?: number,
        ): void;

        /**
         * Sight here is the mob.sight var, which tells byond what to actually show to our client
         * See [code\__DEFINES\sight.dm] for more details
         */
        set_sight(
            this: Byond.Mob,
            sight: Bitflag<[SeeInvisibleObserver]>,
        ): void;

        mind_initialize(this: Byond.Mob): void;
    }

    namespace Mob {
        class Living extends Byond.Mob {
            getarmor(
                this: Byond.Mob.Living,
                defType: string,
                type: string,
            ): number;
        }

        namespace Living {
            class Carbon extends Byond.Mob.Living {
                dna: Byond.Datum.Dna;
            }

            namespace Carbon {
                class Human extends Byond.Mob.Living.Carbon {}
            }
        }

        class Eye extends Byond.Mob {}
    }

    interface Atom {
        /**
         * Helper for logging chat messages or other logs with arbitrary inputs (e.g. announcements)
         *
         * This proc compiles a log string by prefixing the tag to the message
         * and suffixing what it was forced_by if anything
         * if the message lacks a tag and suffix then it is logged on its own
         * Arguments:
         * * message - The message being logged
         * * message_type - the type of log the message is(ATTACK, SAY, etc)
         * * tag - tag that indicates the type of text(announcement, telepathy, etc)
         * * log_globally - boolean checking whether or not we write this log to the log file
         * * forced_by - source that forced the dialogue if any
         */
        log_talk(
            this: Byond.Atom,
            message: string,
            message_type: __private.Log,
            tag?: string,
            log_globally?: Byond.Bool,
            forced_by?: Byond.Datum,
            custom_say_emote?: string,
        ): void;
    }

    namespace Atom {
        interface Movable {
            /** The list of factions this atom belongs to (used for cacheable faction strings - these tend to not change very often) */
            faction: Byond.List<number, string> | undefined;

            /**
             * This proc is used to generate the 'message' part of a chat message.
             *
             * Generates the `says, "<span class='red'>meme</span>"` part of the `Grey Tider says, "meme"`,
             * or the `taps their microphone.` part of `Grey Tider taps their microphone.`.
             *
             * @param input The message to be said
             * @param spans A list of spans to attach to the message. Includes the atom's speech span by default
             * @param message_mods A list of message modifiers, i.e. whispering/singing
             * @returns The generated message part
             */
            generate_messagepart(
                this: Byond.Atom.Movable,
                input: string,
                spans?: Byond.List<number, string>,
                message_mods?: List<number, string>,
            ): string;
        }
    }

    namespace Obj {
        class Item extends Byond.Obj {}

        namespace Item {
            class Organ extends Byond.Obj.Item {
                Insert(
                    this: Byond.Obj.Item.Organ,
                    target: Byond.Mob.Living.Carbon,
                    special?: Byond.Bool,
                    movementFlags?: number,
                ): void;
            }
        }
    }
}

declare interface GlobalVars {
    SSfastprocess: SS13.SSfastprocess;
    SSlua: SS13.SSlua;
    SSmapping: SS13.SSmapping;
    SSmobs: SS13.SSmobs;
    SSspatial_grid: SS13.SSspatial_grid;
}

/** @noSelf */
declare interface GlobalProcs {
    REF(thing: Byond.Datum): string;
    _has_trait(target: Byond.Datum, trait: string): Byond.Bool;
    _prob(chance: number): Byond.Bool;
    _locate(x: number, y: number, z: number): Byond.Turf;
    _block(
        point1: Byond.Turf,
        point2: Byond.Turf,
    ): Byond.List<number, Byond.Turf>;
    to_chat(user: Byond.Datum, message: string): void;
    trim(string: string): string;
    _copytext(text: string, from: number, to: number): string;
    relay_to_list_and_observers(
        message: string,
        mob_list: Byond.List<number, Byond.Mob> | Byond.Mob[],
        source: Byond.Atom,
        message_type?: number,
    ): void;
    _add_trait(target: Byond.Datum, trait: string, source: string): void;

    /**
     * The exact same as get_hearers_in_view, but not limited by visibility. Does no filtering for traits, line of sight, or any other such criteria.
     * Filtering is intended to be done by whatever calls this function.
     *
     * This function exists to allow for mobs to hear speech without line of sight, if such a thing is needed.
     *
     * * radius - what radius search circle we are using, worse performance as this increases
     * * source - object at the center of our search area. everything in get_turf(source) is guaranteed to be part of the search area
     * * contents_type - the type of contents we want to be looking for. defaults to hearing sensitive
     */
    get_hearers_in_range(
        range: number,
        source: Byond.Atom,
        contents_type?:
            | "recursive_contents_area_sensitive"
            | "recursive_contents_hearing_sensitive"
            | "recursive_contents_client_mobs"
            | "recursive_contents_active_storage",
    ): Byond.List<number, Byond.Atom.Movable>;
}

type SeeInvisibleObserver = 60;

declare namespace __private {
    /** Dont use directly */
    enum Log {
        Attack = 1 << 0,
        Say = 1 << 1,
        Whisper = 1 << 2,
        Emote = 1 << 3,
        Dsay = 1 << 4,
        Pda = 1 << 5,
        Chat = 1 << 6,
        Comment = 1 << 7,
        Telecomms = 1 << 8,
        OOC = 1 << 9,
        Admin = 1 << 10,
        Ownership = 1 << 11,
        Game = 1 << 12,
        AdminPrivate = 1 << 13,
        Asay = 1 << 14,
        Mecha = 1 << 15,
        Virus = 1 << 16,
        Shuttle = 1 << 17,
        Econ = 1 << 18,
        Victim = 1 << 19,
        RadioEmote = 1 << 20,
        SpeechIndicators = 1 << 21,
        LOOC = 1 << 22,
        Hallucination = 1 << 23,
        Transport = 1 << 24,
    }
}
