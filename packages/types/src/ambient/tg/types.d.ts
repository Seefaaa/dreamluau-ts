/// <reference path="../../index.d.ts" />

// will remove
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
        dead_players_by_zlevel: Byond.List<number, Byond.List<number, Byond.Mob>>;
    }

    class SSspatial_grid extends Subsystem {}

    class SSpolling extends Subsystem {
        poll_ghost_candidates(
            question?: string,
            role?: string,
            check_jobban?: Byond.Bool,
            poll_time?: number,
            ignore_category?: string,
            flashwindow?: Byond.Bool | boolean,
            alert_pic?: Byond.Type<Byond.Atom> | Byond.Atom | Byond.Image,
            jump_target?: Byond.Atom,
            role_name_text?: string,
            custom_response_messages?: Byond.List<number, string> | readonly string[],
            start_signed_up?: Byond.Bool,
            amount_to_pick?: number,
            chat_text_border_icon?: Byond.Icon,
            announce_chosen?: Byond.Bool
        ): Byond.List<number, Byond.Mob> | Byond.Mob | undefined;
    }
}

declare namespace Byond {
    interface Datum {
        /**
         * Proc that handles adding multiple traits to a target via a list. Must have a common source and target.
         */
        add_traits(
            this: Byond.Datum,
            traits: Byond.List<number, string> | readonly [string, ...string[]],
            source: string
        ): void;

        /**
         * Proc that handles removing multiple traits from a target via a list. Must have a common source and target.
         */
        remove_traits(
            this: Byond.Datum,
            traits: Byond.List<number, string> | readonly [string, ...string[]],
            source: string
        ): void;

        /**
         * Stop listening to a given signal from target
         *
         * Breaks the relationship between target and source datum, removing the callback when the signal fires
         *
         * Doesn't care if a registration exists or not
         *
         * Arguments:
         * * datum/target Datum to stop listening to signals from
         * * sig_typeor_types Signal string key or list of signal keys to stop listening to specifically
         */
        UnregisterSignal(
            this: Byond.Datum,
            target: Byond.Datum,
            sig_type_or_types: keyof SignalRegistry | readonly (keyof SignalRegistry)[]
        ): void;
    }

    namespace Datum {
        class ThrownThing extends Byond.Datum {}

        class Callback extends Byond.Datum {}

        class Reagent extends Byond.Datum {
            /**
             * pretend this is moles
             */
            volume: number;
        }

        namespace Reagent {
            class Blob extends Byond.Datum.Reagent {}

            namespace Blob {
                class NetworkedFibers extends Byond.Datum.Reagent.Blob {}
            }
        }

        class Reagents extends Byond.Datum {
            /**
             * The reagents being held
             */
            reagent_list: Byond.List<number, Byond.Datum.Reagent>;

            /**
             * Current volume of all the reagents
             */
            total_volume: number;

            /**
             * Max volume of this holder
             */
            maximum_volume: number;

            /**
             * The atom this holder is attached to
             */
            my_atom: Byond.Atom | undefined;

            /**
             * Current temp of the holder volume
             */
            chem_temp: number;

            /**
             * pH of the whole system
             */
            ph: number;

            /**
             * various flags, see code\__DEFINES\reagents.dm
             */
            flags: number;

            /**
             * list of reactions currently on going, this is a lazylist for optimisation
             */
            reaction_list: Byond.List<number, Byond.Datum.Equilibrium> | undefined;

            /**
             * Hard check to see if the reagents is presently reacting
             */
            is_reacting: Byond.Bool;

            /**
             * Keeps the id of the reaction displayed in the ui
             */
            ui_reaction_id: number | undefined;

            /**
             * Keeps the id of the reagent displayed in the ui
             */
            ui_reagent_id: number | undefined;

            /**
             * The bitflag of the currently selected tags in the ui
             */
            ui_tags_selected: number;

            /**
             * What index we're at if we have multiple reactions for a reagent product
             */
            ui_reaction_index: number;

            /**
             * If we're syncing with the beaker - so return reactions that are actively happening
             */
            ui_beaker_sync: Byond.Bool;

            /**
             * Returns a reagent from this holder if it matches all the specified arguments
             * Arguments
             *
             * * [target_reagent][datum/reagent] - the reagent typepath to check for. can be null to return any reagent
             * * amount - checks for having a specific amount of that chemical
             * * needs_metabolizing - takes into consideration if the chemical is matabolizing when it's checked.
             * * check_subtypes - controls whether it should it should also include subtypes: ispath(type, reagent) versus type == reagent.
             * * chemical_flags - checks for reagent flags.
             */
            has_reagent(
                this: Byond.Datum.Reagents,
                target_reagent: Byond.Type<Byond.Datum.Reagent>,
                amount?: number,
                needs_metabolizing?: Byond.Bool | boolean,
                check_subtypes?: Byond.Bool | boolean,
                chemical_flags?: number
            ): Byond.Datum.Reagent | Byond.False;

            /**
             * Adds a reagent to this holder
             *
             * Arguments:
             * * reagent - The reagent id to add
             * * amount - Amount to add
             * * list/data - Any reagent data for this reagent, used for transferring data with reagents
             * * reagtemp - Temperature of this reagent, will be equalized
             * * no_react - prevents reactions being triggered by this addition
             * * added_purity - override to force a purity when added
             * * added_ph - override to force a pH when added
             * * override_base_ph - ingore the present pH of the reagent, and instead use the default (i.e. if buffers/reactions alter it)
             * * list/reagent_added - If not null will contain an map of [reagent datum->amount added] which holds the inverse chems added to mobs. Clear the list to erase old values
             * * creation_callback - Callback to invoke when the reagent is created
             */
            add_reagent(
                reagent_type: Byond.Type<Byond.Datum.Reagent>,
                amount: number,
                data?: Byond.List<AnyNotNil, any>,
                reagtemp?: number,
                added_purity?: number,
                added_ph?: number,
                no_react?: Byond.Bool | boolean,
                override_base_ph?: Byond.Bool | boolean,
                reagent_added?: Byond.List<Byond.Datum.Reagent, number>,
                creation_callback?: Datum.Callback
            ): number | Byond.False;
        }

        class Equilibrium extends Byond.Datum {}

        class Dna extends Byond.Datum {
            species: Byond.Datum.Species;
        }

        class Species extends Byond.Datum {}

        namespace Species {
            class Zombie extends Byond.Datum.Species {}

            namespace Zombie {
                class Infectious extends Byond.Datum.Species.Zombie {}
            }

            class Human extends Byond.Datum.Species {}
        }

        class HttpRequest extends Byond.Datum {
            prepare(
                this: Byond.Datum.HttpRequest,
                method: "get" | "post",
                url: string,
                body: string,
                headers: string,
                output: string
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
            default_button_position: "default" | "floating" | "list" | "palette" | "first";
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

            /**
             * Starts a cooldown time for this ability only
             *
             * Will use default cooldown time if an override is not specified
             */
            StartCooldownSelf(this: Byond.Datum.Action.Cooldown, override_cooldown_time?: number): void;
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
                initialized_actions: Byond.List<Byond.Datum.Action.Cooldown, number>;

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
                    refund_cooldown?: Byond.Bool | boolean
                ): void;
            }
        }

        class Antagonist extends Byond.Datum {
            /**
             * Public name for this antagonist. Appears for player prompts and round-end reports.
             */
            name: string;
            /**
             * Set to false to hide the antagonists from roundend report
             */
            get show_in_roundend(): Byond.Bool;
            set show_in_roundend(value: Byond.Bool | boolean);
            /**
             * Should this antagonist be shown as antag to ghosts? Shouldn't be used for stealthy antagonists like traitors
             */
            get show_to_ghosts(): Byond.Bool;
            set show_to_ghosts(value: Byond.Bool | boolean);
            /**
             * Antagpanel will display these together, REQUIRED
             */
            antagpanel_category: string;
            /**
             * name of the UI that will try to open, right now using a generic ui
             */
            ui_name: string | undefined;
            /**
             * List of the objective datums that this role currently has, completing all objectives at round-end will cause this antagonist to greentext.
             */
            objectives: Byond.List<number, Byond.Datum.Objective>;

            /**
             * Called by the remove_antag_datum() and remove_all_antag_datums() mind procs for the antag datum to handle its own removal and deletion.
             */
            on_removal(this: Byond.Datum.Antagonist): void;
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
            get completed(): Byond.Bool;
            set completed(value: Byond.Bool | boolean);
            /** If the objective is compatible with martyr objective, i.e. if you can still do it while dead. */
            martyr_compatible: Byond.Bool;
            /** can this be granted by admins? */
            admin_grantable: Byond.Bool;
        }

        class Mind extends Byond.Datum {
            add_antag_datum(
                this: Byond.Datum.Mind,
                antag: Byond.Type<Byond.Datum.Antagonist> | Byond.Datum.Antagonist,
                team?: Byond.Datum.Team
            ): void;

            transfer_to(this: Byond.Datum.Mind, new_character: Byond.Mob, force_key_move?: Byond.Bool | boolean): void;
        }

        class Team extends Byond.Datum {}

        class MoveSpeedModifier extends Byond.Datum {}

        namespace MoveSpeedModifier {
            class AdminVaredit extends Byond.Datum.MoveSpeedModifier {}
        }

        class Physiology extends Byond.Datum {
            /**
             * Multiplier to brute damage received.
             *
             * IE: A brute mod of 0.9 = 10% less brute damage.
             *
             * Only applies to damage dealt via [apply_damage][/mob/living/proc/apply_damage] unless factored in manually.
             */
            brute_mod: number;

            /**
             * Multiplier to burn damage received
             */
            burn_mod: number;

            /**
             * Multiplier to toxin damage received
             */
            tox_mod: number;

            /**
             * Multiplier to oxygen damage received
             */
            oxy_mod: number;

            /**
             * Multiplier to stamina damage received
             */
            stamina_mod: number;

            /**
             * Multiplier to brain damage received
             */
            brain_mod: number;

            /**
             * Multiplier to damage taken from high / low pressure exposure, stacking with the brute modifier
             */
            pressure_mod: number;

            /**
             * Multiplier to damage taken from high temperature exposure, stacking with the burn modifier
             */
            heat_mod: number;

            /**
             * Multiplier to damage taken from low temperature exposure, stacking with the toxin modifier
             */
            cold_mod: number;

            /**
             * Flat damage reduction from taking damage
             *
             * Unlike the other modifiers, this is not a multiplier.
             *
             * IE: DR of 10 = 10% less damage.
             */
            damage_resistance: number;

            /**
             * Resistance to shocks
             */
            siemens_coeff: number;

            /**
             * Multiplier applied to all incapacitating stuns (knockdown, stun, paralyze, immobilize)
             */
            stun_mod: number;

            /**
             * Multiplied aplpied to just knockdowns, stacks with above multiplicatively
             */
            knockdown_mod: number;

            /**
             * Modifier to amount of blood lost when bleeding (both on life ticks and from flat bleed calls)
             */
            bleed_mod: number;

            /**
             * Modifier to amount blood regenerated per life tick
             */
            blood_regen_mod: number;

            /**
             * internal armor datum
             */
            armor: Byond.Datum.Armor;

            /**
             * % of hunger rate taken per tick.
             */
            hunger_mod: number;
        }

        class Armor extends Byond.Datum {}

        class FluidGroup extends Byond.Datum {
            /**
             * The set of fluid objects currently in this group.
             */
            nodes: Byond.List<number, Byond.Obj.Effect.ParticleEffect.Fluid>;
            /**
             * The number of fluid object that this group wants to have contained.
             */
            target_size: number;
            /**
             * The total number of fluid objects that have ever been in this group.
             */
            total_size: number;
        }
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

        /**
         * Whether a mob is alive or dead. TODO: Move this to living - Nodrak (2019, still here)
         */
        stat: Enums.MobStat;

        /**
         * list of items held in hands
         *
         * len = number of hands, eg: 2 nulls is 2 empty hands, 1 item and 1 null is 1 full hand
         * and 1 empty hand.
         *
         * NB: contains nulls!
         *
         * `held_items[active_hand_index]` is the actively held item, but please use
         * [get_active_held_item()][/mob/proc/get_active_held_item] instead, because OOP
         */
        held_items: Byond.List<number, Byond.Obj.Item | undefined>;

        /**
         * Calls relay_move() to whatever this is set to when the mob tries to move
         */
        remote_control: Atom.Movable | undefined;

        /**
         * Used for variable slowdowns like hunger/health loss/etc, works somewhat like the old list-based modification adds. Returns the modifier datum if successful
         *
         * How this SHOULD work is:
         *
         * 1. Ensures type_id_datum one way or another refers to a /variable datum. This makes sure it can't be cached. This includes if it's already in the modification list.
         * 2. Instantiate a new datum if type_id_datum isn't already instantiated + in the list, using the type. Obviously, wouldn't work for ID only.
         * 3. Add the datum if necessary using the regular add proc
         * 4. If any of the rest of the args are not null (see: multiplicative slowdown), modify the datum
         * 5. Update if necessary
         */
        add_or_update_variable_movespeed_modifier<T extends Byond.Datum.MoveSpeedModifier>(
            this: Byond.Mob,
            type_id_datum: Byond.Type<T> | T | string,
            update?: Byond.Bool | boolean,
            multiplicative_slowdown?: number
        ): Byond.Datum.MoveSpeedModifier;

        get_organ_slot(this: Byond.Mob, slot: "zombie_infection"): Byond.Obj.Item.Organ.ZombieInfection | undefined;
        get_organ_slot(this: Byond.Mob, slot: string): Byond.Obj.Item.Organ | undefined;

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
            turf_source: Byond.Turf | undefined,
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
            min_volume?: number
        ): void;

        /**
         * Sight here is the mob.sight var, which tells byond what to actually show to our client
         * See [code\__DEFINES\sight.dm] for more details
         */
        set_sight(this: Byond.Mob, sight: Bitflag<[Bitflags.SeeInvisibleObserver]>): void;

        mind_initialize(this: Byond.Mob): void;

        /**
         * Remove a move speed modifier from a mob, whether static or variable.
         */
        remove_movespeed_modifier(
            this: Byond.Mob,
            type_id_datum: Byond.Type<Byond.Datum.MoveSpeedModifier> | Byond.Datum.MoveSpeedModifier | string,
            update?: Byond.Bool | boolean
        ): Byond.Bool;

        emote(
            this: Byond.Mob,
            act: string,
            type_override?: Bitflags.Emote,
            message?: string,
            intentional?: Byond.Bool | boolean,
            force_silence?: Byond.Bool | boolean,
            forced?: Byond.Bool | boolean
        ): Byond.Bool;

        set_species<T extends Byond.Datum.Species>(
            this: Byond.Mob,
            species: Byond.Type<T>,
            icon_update?: Byond.Bool | boolean
        ): void;

        /**
         * Reset the attached clients perspective (viewpoint)
         *
         * reset_perspective(null) set eye to common default : mob on turf, loc otherwise
         * reset_perspective(thing) set the eye to the thing (if it's equal to current default reset to mob perspective)
         */
        reset_perspective(this: Byond.Mob, new_eye?: Byond.Atom): Byond.Bool | undefined;

        /**
         * # Ghostize
         *
         * Creates a /mob/dead/observer and moves the player's key into it (among other handling for player->observer)
         * Ignores things like adminghosts and corpselocked (ethereal) players.
         * Args:
         * can_reenter_corse: Whether the new Ghost will be able to click "Re-enter body", TRUE by default.
         * forced: Whether we are forcing this player to be ghosted, ignoring things like corpselocking, FALSE by default.
         */
        ghostize(
            this: Byond.Mob,
            can_reenter_corpse?: Byond.Bool | boolean,
            forced?: Byond.Bool | boolean
        ): Byond.Mob.Dead.Observer | undefined;
    }

    namespace Mob {
        class Living extends Byond.Mob {
            /**
             * Variable to track the body position of a mob, regardgless of the actual angle of rotation (usually matching it, but not necessarily).
             */
            body_position: Enums.BodyPosition;

            /**
             * Flags that determine the potential of a mob to perform certain actions. Do not change this directly.
             */
            mobility_flags: Bitflags.Mobility;

            getarmor(this: Byond.Mob.Living, defType: string | undefined, type: string): number;

            set_tox_loss(
                this: Byond.Mob.Living,
                amount: number,
                updating_health?: Byond.Bool | boolean,
                forced?: Byond.Bool | boolean,
                required_biotype?: number
            ): number | Byond.Bool;
        }

        namespace Living {
            class Carbon extends Byond.Mob.Living {
                dna: Byond.Datum.Dna;
            }

            namespace Carbon {
                class Human extends Byond.Mob.Living.Carbon {
                    physiology: Byond.Datum.Physiology;
                }
            }
        }

        class Dead extends Byond.Mob {}

        namespace Dead {
            class Observer extends Byond.Mob.Dead {}
        }

        class Eye extends Byond.Mob {}
    }

    interface Atom {
        /**
         * Reagents holder
         */
        reagents: Byond.Datum.Reagents | undefined;

        /**
         * This displaces the object’s icon vertically by the specified number of pixels. This is meant to be used in situations where world.map_format is used to display something other than a top-down form, for instance in an isometric or side-view display. In a top-down mode pixel_z behaves the same as pixel_y, except that it does not rotate with changes to client.dir.
         *
         * This effect is purely visual and does not influence such things as movement bumping or view() range calculations.
         */
        pixel_z: number;

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
            message_type: Enums.Log,
            tag?: string,
            log_globally?: Byond.Bool,
            forced_by?: Byond.Datum,
            custom_say_emote?: string
        ): void;

        /**
         * Creates text that will float from the atom upwards to the viewer.
         *
         * Args:
         * * mob/viewer: The mob the text will be shown to. Nullable (But only in the form of it won't runtime).
         * * text: The text to be shown to viewer. Must not be null.
         */
        balloon_alert(this: Byond.Atom, viewer: Byond.Mob | undefined, text: string): void;

        /**
         * Hook for running code when a dir change occurs
         *
         * Not recommended to use, listen for the [COMSIG_ATOM_DIR_CHANGE] signal instead (sent by this proc)
         */
        setDir(this: Byond.Atom, new_dir: Byond.Direction): void;
    }

    namespace Atom {
        interface Movable {
            /** The list of factions this atom belongs to (used for cacheable faction strings - these tend to not change very often) */
            faction: Byond.List<number, string> | undefined;

            /**
             * The voice that this movable makes when speaking
             */
            voice: string | undefined;

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
                spans?: Byond.List<number, string> | readonly string[],
                message_mods?: List<number, string>
            ): string;

            /**
             * meant for movement with zero side effects. only use for objects that are supposed to move "invisibly" (like eye mobs or ghosts)
             * if you want something to move onto a tile with a beartrap or recycler or tripmine or mouse without that object knowing about it at all, use this
             * most of the time you want forceMove()
             */
            abstract_move(this: Byond.Atom.Movable, new_loc: Byond.Atom): void;

            forceMove(this: Byond.Atom.Movable, destination: Byond.Atom): Byond.Bool;

            Move(
                this: Byond.Atom.Movable,
                new_loc: Byond.Atom,
                direct: Byond.Direction,
                glide_size_override?: number,
                update_dir?: Byond.Bool | boolean
            ): Byond.Bool | undefined;
        }
    }

    interface Obj {
        force: number;

        /**
         * A multiplier to an object's force when used against a structure, vehicle, machine, or robot.
         * Use [/obj/proc/get_demolition_modifier] to get the value.
         */
        demolition_mod: number;
    }

    namespace Obj {
        class Item extends Byond.Obj {}

        namespace Item {
            class Organ extends Byond.Obj.Item {
                /**
                 * Random flags that describe this organ
                 */
                organ_flags: Bitflags.Organ;

                Insert(
                    this: Byond.Obj.Item.Organ,
                    target: Byond.Mob.Living.Carbon,
                    special?: Byond.Bool,
                    movementFlags?: number
                ): void;
            }

            namespace Organ {
                class ZombieInfection extends Byond.Obj.Item.Organ {
                    old_species: Byond.Type<Byond.Datum.Species> | undefined;
                }
            }

            class AmmoCasing extends Byond.Obj.Item {
                fire_casing(
                    this: Byond.Obj.Item.AmmoCasing,
                    target: Byond.Atom,
                    user: Byond.Mob.Living,
                    params: string | undefined,
                    distro: number | undefined,
                    quiet: Byond.Bool | undefined,
                    zone_override: Enums.BodyZoneAll | undefined,
                    spread: number,
                    fired_from: Byond.Atom
                ): Byond.Bool;
            }

            namespace AmmoCasing {
                class Magic extends Byond.Obj.Item.AmmoCasing {}

                namespace Magic {
                    class Hook extends Byond.Obj.Item.AmmoCasing.Magic {}
                }
            }
        }

        class Projectile extends Byond.Obj {}

        class Effect extends Byond.Obj {}

        namespace Effect {
            class ParticleEffect extends Byond.Obj {}

            namespace ParticleEffect {
                class Fluid extends Byond.Obj.Effect.ParticleEffect {}

                namespace Fluid {
                    class Foam extends Byond.Obj.Effect.ParticleEffect.Fluid {
                        reagents: Byond.Datum.Reagents;
                    }

                    namespace Foam {
                        class ShortLife extends Byond.Obj.Effect.ParticleEffect.Fluid.Foam {}
                    }
                }
            }
        }

        class Structure extends Byond.Obj {}

        namespace Structure {
            class Barricade extends Byond.Obj.Structure {}

            namespace Barricade {
                class Wooden extends Byond.Obj.Structure.Barricade {}

                namespace Wooden {
                    class Crude extends Byond.Obj.Structure.Barricade.Wooden {}
                }
            }

            class Window extends Byond.Obj.Structure {}
        }
    }

    interface Turf {
        /**
         * list of turfs adjacent to us that air can flow onto
         */
        atmos_adjacent_turfs: Byond.List<Byond.Turf, Byond.True> | undefined;
    }
}

declare namespace Bitflags {
    type SeeInvisibleObserver = 60;

    // type ReagentMethodTouch = 1;
    // type ReagentMethodIngest = 2;
    // type ReagentMethodVapor = 4;
    // type ReagentMethodPatch = 8;
    // type ReagentMethodInject = 16;
    // type ReagentMethodLinear = 32;
    // type ReagentMethodInhale = 64;

    namespace Emote {
        type Audible = 1;
        type Visible = 2;
        type Important = 4;
        type RuneChat = 8;
    }

    type Emote = Bitflag<
        [Bitflags.Emote.Audible, Bitflags.Emote.Visible, Bitflags.Emote.Important, Bitflags.Emote.RuneChat]
    >;

    namespace Mobility {
        type Move = 1;
        type Stand = 2;
        type Pickup = 4;
        type Use = 8;
        type Ui = 16;
        type Storage = 32;
        type Pull = 64;
        type Rest = 128;
        type LieDown = 256;
    }

    type Mobility = Bitflag<
        [
            Bitflags.Mobility.Move,
            Bitflags.Mobility.Stand,
            Bitflags.Mobility.Pickup,
            Bitflags.Mobility.Use,
            Bitflags.Mobility.Ui,
            Bitflags.Mobility.Storage,
            Bitflags.Mobility.Pull,
            Bitflags.Mobility.Rest,
            Bitflags.Mobility.LieDown,
        ]
    >;

    namespace Organ {
        type Organic = 1;
        type Robotic = 2;
        type Mineral = 4;
        type Frozen = 8;
        type Failing = 16;
        type EMP = 32;
        type Vital = 64;
        type Edible = 128;
        type Unremovable = 256;
        type Hidden = 512;
        type Virgin = 1024;
        type Prominent = 2048;
        type Hazardous = 4096;
        type External = 8192;
        type Ghost = 16384;
        type Mutant = 32768;
        type Unusable = 65536;
    }

    type Organ = Bitflag<
        [
            Bitflags.Organ.Organic,
            Bitflags.Organ.Robotic,
            Bitflags.Organ.Mineral,
            Bitflags.Organ.Frozen,
            Bitflags.Organ.Failing,
            Bitflags.Organ.EMP,
            Bitflags.Organ.Vital,
            Bitflags.Organ.Edible,
            Bitflags.Organ.Unremovable,
            Bitflags.Organ.Hidden,
            Bitflags.Organ.Virgin,
            Bitflags.Organ.Prominent,
            Bitflags.Organ.Hazardous,
            Bitflags.Organ.External,
            Bitflags.Organ.Ghost,
            Bitflags.Organ.Mutant,
            Bitflags.Organ.Unusable,
        ]
    >;
}

declare namespace Enums {
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

    enum MobStat {
        Conscious = 0,
        SoftCrit = 1,
        Unconscious = 2,
        HardCrit = 3,
        Dead = 4,
    }

    enum BodyPosition {
        StandingUp = 0,
        LyingDown = 1,
    }

    type BodyZone = "head" | "chest" | "l_arm" | "r_arm" | "l_leg" | "r_leg";
    type BodyZonePrecise = "eyes" | "mouth" | "groin" | "l_hand" | "r_hand" | "l_foot" | "r_foot";
    type BodyZoneAll = BodyZone | BodyZonePrecise;
}
