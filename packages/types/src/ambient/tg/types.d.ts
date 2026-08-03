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

    class SSdcs extends Subsystem {}

    class SSspatial_grid extends Subsystem {}

    class SSpolling extends Subsystem {
        poll_ghost_candidates(
            question?: string,
            role?: string,
            check_jobban?: Byond.Bool | boolean,
            poll_time?: number,
            ignore_category?: string,
            flashwindow?: Byond.Bool | boolean,
            alert_pic?: Byond.Type<Byond.Atom> | Byond.Atom | Byond.Image,
            jump_target?: Byond.Atom,
            role_name_text?: string,
            custom_response_messages?: Byond.List<number, string> | readonly string[],
            start_signed_up?: Byond.Bool | boolean,
            amount_to_pick?: number,
            chat_text_border_icon?: Byond.Icon,
            announce_chosen?: Byond.Bool | boolean
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

        /** Finds the singleton for the element type given and attaches it to src */
        _AddElement(
            this: Byond.Datum,
            arguments: Byond.List<number, any> | [Byond.Type<Byond.Datum.Element>, ...any[]]
        ): void;

        /**
         * Finds the singleton for the element type given and detaches it from src
         * You only need additional arguments beyond the type if you're using [ELEMENT_BESPOKE]
         */
        _RemoveElement(
            this: Byond.Datum,
            arguments: Byond.List<number, any> | [Byond.Type<Byond.Datum.Element>, ...any[]]
        ): void;
    }

    namespace Datum {
        class ThrownThing extends Byond.Datum {}

        class Callback extends Byond.Datum {}

        class Admins extends Byond.Datum {}

        /**
         * A weakref holds a non-owning reference to a datum.
         * The datum can be referenced again using `resolve()`.
         */
        class Weakref<T extends Byond.Datum> extends Byond.Datum {
            reference: string;

            /**
             * Retrieves the datum that this weakref is referencing.
             *
             * This will return `null` if the datum was deleted. This MUST be respected.
             */
            resolve(this: Byond.Datum.Weakref<T>): T | undefined;
        }

        class GasMixture extends Byond.Datum {
            /**
             * Associative list of moles for each gas. List key is /datum/gas/<gas_name>, value is amount in moles
             */
            moles: Byond.List<Byond.Type, number>;
            /**
             * Archived version of moles
             */
            moles_archive: Byond.List<Byond.Type, number>;
            /**
             * Static list of gas meta data like heat capacity (initialized globally)
             */
            gas_meta: Byond.List<number, Byond.List<Byond.Type, unknown>>;
            /**
             * The temperature of the gas mix in kelvin. Should never be lower then TCMB
             */
            temperature: number;
            /**
             * Used, like all archived variables, to ensure turf sharing is consistent inside a tick, no matter
             * The order of operations
             */
            temperature_archived: number;
            /**
             * Volume in liters (duh)
             */
            volume: number;
            /**
             * The last tick this gas mixture shared on. A counter that turfs use to manage activity
             */
            last_share: number;
            /**
             * Tells us what reactions have happened in our gasmix. Assoc list of reaction - moles reacted pair.
             */
            reaction_results: Byond.List<Byond.Type, number>;
            /**
             * Whether to call garbage_collect() on the sharer during shares, used for immutable mixtures
             */
            get gc_share(): Byond.Bool;
            set gc_share(value: Byond.Bool | boolean);
            /**
             * When this gas mixture was last touched by pipeline processing
             * I am sorry
             */
            pipeline_cycle: number;
        }

        class Browser extends Byond.Datum {
            user: Byond.Mob | undefined;
            title: string;
            /**
             * window_id is used as the window name for browse and onclose
             */
            window_id: string | undefined;
            width: number;
            height: number;
            source_ref: Byond.Datum.Weakref<Byond.Atom> | undefined;
            /**
             * window option is set using window_id
             */
            window_options: string;
            stylesheets: Byond.List<number, string>;
            scripts: Byond.List<number, string>;
            head_elements: string | undefined;
            body_elements: string | undefined;
            head_content: string;
            content: string;

            set_content(this: Byond.Datum.Browser, content: string): void;

            open(this: Byond.Datum.Browser, use_on_close?: Byond.Bool | boolean): void;
        }

        class Job extends Byond.Datum {}

        class SpriteAccessory extends Byond.Datum {}

        namespace SpriteAccessory {
            class Clothing extends Byond.Datum.SpriteAccessory {}
        }

        class Outfit extends Byond.Datum {
            /**
             * Name of the outfit (shows up in the equip admin verb)
             */
            name: string;
            /**
             * Type path of item to go in the idcard slot
             */
            id: Byond.Type<Byond.Obj.Item.Card.Id> | undefined;
            /**
             * Type path of ID card trim associated with this outfit.
             */
            id_trim: Byond.Type<Byond.Datum.IdTrim> | undefined;
            /**
             * Type path of item to go in uniform slot
             */
            uniform: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in suit slot
             */
            suit: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in suit storage slot
             *
             * (make sure it's valid for that suit)
             */
            suit_store: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in back slot
             */
            back: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * list of items that should go in the backpack of the user
             *
             * Format of this list should be: list(path=count,otherpath=count)
             */
            backpack_contents: Byond.List<Byond.Type<Byond.Obj.Item>, number> | undefined;
            /**
             * Type path of item to go in belt slot
             */
            belt: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * list of items that should go in the belt of the user
             *
             * Format of this list should be: list(path=count,otherpath=count)
             */
            belt_contents: Byond.List<Byond.Type<Byond.Obj.Item>, number> | undefined;
            /**
             * Type path of item to go in ears slot
             */
            ears: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in the glasses slot
             */
            glasses: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in gloves slot
             */
            gloves: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in head slot
             */
            head: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in mask slot
             */
            mask: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in neck slot
             */
            neck: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in shoes slot
             */
            shoes: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item for left pocket slot
             */
            l_pocket: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item for right pocket slot
             */
            r_pocket: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Type path of item to go in the right hand
             */
            l_hand: Byond.Type<Byond.Obj.Item> | undefined;
            r_hand: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Any clothing accessory item
             */
            accessory: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * Internals box. Will be inserted at the start of backpack_contents
             */
            box: Byond.Type<Byond.Obj.Item> | undefined;
            /**
             * extra types for chameleon outfit changes, mostly guns
             *
             * Valid values are a single typepath or list of typepaths
             *
             * These are all added and returns in the list for get_chamelon_diguise_info proc
             */
            chameleon_extras: Byond.Type<Byond.Obj.Item> | Byond.List<number, Byond.Type<Byond.Obj.Item>> | undefined;
            /**
             * Any implants the mob should start implanted with
             *
             * Format of this list is (typepath, typepath, typepath)
             */
            implants: Byond.List<number, Byond.Type<Byond.Obj.Item.Implant>> | undefined;
            /**
             * ID of the slot containing a gas tank
             */
            internals_slot: Enums.ItemSlot | undefined;
            /**
             * Any skillchips the mob should have in their brain.
             *
             * Format of this list is (typepath, typepath, typepath)
             */
            skillchips: Byond.List<number, Byond.Type<Byond.Obj.Item>> | undefined;
            /**
             * Should we preload some of this job's items?
             */
            get preload(): Byond.Bool;
            set preload(value: Byond.Bool | boolean);
            /**
             * Any undershirt. While on humans it is a string, here we use paths to stay consistent with the rest of the equips.
             */
            undershirt: Byond.Type<Byond.Datum.SpriteAccessory.Clothing> | undefined;
            underwear: Byond.Type<Byond.Datum.SpriteAccessory.Clothing> | undefined;
            socks: Byond.Type<Byond.Datum.SpriteAccessory.Clothing> | undefined;
        }

        namespace Outfit {
            class Job extends Byond.Datum.Outfit {
                jobtype: Byond.Type<Byond.Datum.Job> | undefined;
                backpack: Byond.Type<Byond.Obj.Item.Storage.Backpack>;
                satchel: Byond.Type<Byond.Obj.Item.Storage.Backpack>;
                duffelbag: Byond.Type<Byond.Obj.Item.Storage.Backpack>;
                messenger: Byond.Type<Byond.Obj.Item.Storage.Backpack>;
                pda_slot: Enums.ItemSlot;
            }

            namespace Job {
                class Assistant extends Byond.Datum.Outfit.Job {}
            }
        }

        class EffectSystem extends Byond.Datum {
            /**
             * Turf on which to spawn the effects
             */
            location: Byond.Turf | undefined;
            /**
             * Atom that is spawning the particles whose location we're following
             */
            holder: Byond.Atom | undefined;

            /**
             * Instruct the effect system to start following an atom. Can be chained into .start()
             */
            attach(this: Byond.Datum.EffectSystem, new_holder: Byond.Atom): Byond.Datum.EffectSystem;

            /**
             * Start the effect system
             */
            start(this: Byond.Datum.EffectSystem): void;
        }

        namespace EffectSystem {
            /**
             * Basic effect system which spawns a certain number of moving effects
             */
            class Basic extends Byond.Datum.EffectSystem {
                /**
                 * Total number of particles to spawn
                 */
                amount: number;
                /**
                 * Should we pick among cardinals or all directions when deciding where the particle should move
                 */
                get cardinals_only(): Byond.Bool;
                set cardinals_only(value: Byond.Bool | boolean);
                /**
                 * Typepath of the effect to spawn
                 */
                effect_type: Byond.Type<Byond.Obj.Effect.ParticleEffect> | undefined;
                /**
                 * Total amount of effects we currently have active
                 */
                total_effects: number;
                /**
                 * Should the system delete itself after finishing?
                 */
                get autocleanup(): Byond.Bool;
                set autocleanup(value: Byond.Bool | boolean);
                /**
                 * Should the system delete effects that stop moving?
                 */
                get delete_on_stop(): Byond.Bool;
                set delete_on_stop(value: Byond.Bool | boolean);
                /**
                 * How frequently (in deciseconds) should we move our particles?
                 */
                step_delay: number;
                /**
                 * The length of the previous assigned moveloop in deciseconds
                 */
                last_loop_length: number;
                /**
                 * List of dirs avalible to pick, used to avoid accidential duplicates
                 */
                pickable_dirs: Byond.List<number, Byond.Direction>;
            }

            namespace Basic {
                class SparkSpread extends Byond.Datum.EffectSystem.Basic {}

                namespace SparkSpread {
                    class Quantum extends Byond.Datum.EffectSystem.Basic.SparkSpread {}
                }
            }

            /**
             * A factory which produces fluid groups.
             */
            class FluidSpread extends Byond.Datum.EffectSystem {
                start(this: Byond.Datum.EffectSystem.FluidSpread, log?: Byond.Bool | boolean): void;
            }

            namespace FluidSpread {
                /** A factory for foam fluid floods. */
                class Foam extends Byond.Datum.EffectSystem.FluidSpread {
                    /** A container for all of the chemicals we distribute through the foam. */
                    chemholder: Byond.Datum.Reagents;
                    /** The amount that we multiply the payload by */
                    reagent_scale: number;
                    /** What type of thing the foam should leave behind when it dissipates. */
                    result_type: Byond.Type<Byond.Atom.Movable> | undefined;

                    start(
                        this: Byond.Datum.EffectSystem.FluidSpread.Foam,
                        log?: Byond.Bool | boolean,
                        lifetime?: number,
                        slippery?: Byond.Bool | boolean
                    ): void;
                }

                namespace Foam {
                    class Short extends Byond.Datum.EffectSystem.FluidSpread.Foam {}
                }
            }
        }

        class Component extends Byond.Datum {}

        namespace Component {
            class Orbiter extends Byond.Datum.Component {}
        }

        class Language extends Byond.Datum {}

        class LanguageHolder extends Byond.Datum {}

        class Saymode extends Byond.Datum {}

        class MovementPacket extends Byond.Datum {}

        class DriftHandler extends Byond.Datum {}

        class BankAccount extends Byond.Datum {}

        class IdTrim extends Byond.Datum {}

        class PodStyle extends Byond.Datum {
            /**
             * Name that pods of this style will be named by default
             */
            name: string;

            /**
             * Name that is displayed to admins in pod config panel
             */
            ui_name: string;

            /**
             * Description assigned to droppods of this style
             */
            desc: string;

            /**
             * Determines if this pod can use animations/masking/overlays
             */
            shape: number;

            /**
             * Base icon state assigned to this pod
             */
            icon_state: string;

            /**
             * Whenever this pod should have a door overlay added to it. Uses [icon_state]_door sprite
             */
            has_door: Byond.Bool;

            /**
             * Decals added to this pod, if any
             */
            decal_icon: string;

            /**
             * Color that this pod glows when landing
             */
            glow_color: string;

            /**
             * Type of rubble that this pod creates upon landing
             */
            rubble_type: number;

            /**
             * ID for TGUI data
             */
            id: string;
        }

        namespace PodStyle {
            class Centcom extends Byond.Datum.PodStyle {}
        }

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

            grab_ghost(this: Byond.Datum.Mind, force?: Byond.Bool | boolean): Byond.Mob.Dead.Observer | undefined;
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

        class Element extends Byond.Datum {}

        namespace Element {
            class WallTearer extends Byond.Datum.Element {}

            class Footstep extends Byond.Datum.Element {}
        }

        class StatusEffect extends Byond.Datum {}

        namespace StatusEffect {
            class Incapacitating extends Byond.Datum.StatusEffect {}

            namespace Incapacitating {
                class Knockdown extends Byond.Datum.StatusEffect.Incapacitating {}
            }
        }

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

    interface Client {
        /** Contains admin info. Null if client is not an admin. */
        holder: Byond.Datum.Admins | undefined;
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

        /** bitflags defining which status effects can be inflicted (replaces canknockdown, canstun, etc) */
        status_flags: Bitflags.Status;

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

        /** Force get the ghost from the mind */
        grab_ghost(this: Byond.Mob, force?: Byond.Bool | boolean): Byond.Mob.Dead.Observer | undefined;

        /** Notify a ghost that its body is being revived */
        notify_revival(
            this: Byond.Mob,
            message?: string,
            sound?: Byond.Sound | string,
            source?: Byond.Atom,
            flashwindow?: Byond.Bool | boolean
        ): Byond.Mob.Dead.Observer | undefined;

        /**
         * UnarmedAttack: The higest level of mob click chain discounting click itself.
         *
         * This handles, just "clicking on something" without an item. It translates
         * into [atom/proc/attack_hand], [atom/proc/attack_animal] etc.
         *
         * Note: proximity_flag here is used to distinguish between normal usage (flag=1),
         * and usage when clicking on things telekinetically (flag=0).  This proc will
         * not be called at ranged except with telekinesis.
         *
         * proximity_flag is not currently passed to attack_hand, and is instead used
         * in human click code to allow glove touches only at melee range.
         *
         * modifiers is a lazy list of click modifiers this attack had,
         * used for figuring out different properties of the click, mostly right vs left and such.
         */
        UnarmedAttack(
            this: Byond.Mob,
            target: Byond.Atom,
            proximity_flag?: Byond.Bool | boolean,
            modifiers?: Byond.List<string, any>
        ): void;
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

            /**
             * Called when the mob dies. Can also be called manually to kill a mob.
             *
             * Arguments:
             * * gibbed - Was the mob gibbed?
             */
            death(this: Byond.Mob.Living, gibbed?: Byond.Bool | boolean): Byond.Bool;

            /**
             * Returns a bodypart of the specified zone that this mob has
             *
             * * zone: the zone to get.
             * Defaults to chest, allowing for skilling zone nullchecks if you don't care what bodypart you get.
             * * include_stumps: whether or not to consider stumps as valid bodyparts to return.
             * Defaults to FALSE, meaning that if a limb is missing (is a stump), nothing will be returned.
             *
             * Returns a bodypart, or null.
             */
            get_bodypart(
                this: Byond.Mob.Living,
                zone?: Enums.BodyZone,
                include_stumps?: Byond.Bool | boolean
            ): Byond.Obj.Item.Bodypart | undefined;

            /**
             * Blow up the mob into giblets
             *
             * drop_bitflags: (see code/__DEFINES/blood.dm)
             * * DROP_BRAIN - Gibbed mob will drop a brain
             * * DROP_ORGANS - Gibbed mob will drop organs
             * * DROP_BODYPARTS - Gibbed mob will drop bodyparts (arms, legs, etc.)
             * * DROP_ITEMS - Gibbed mob will drop carried items (otherwise they get deleted)
             * * DROP_ALL_REMAINS - Gibbed mob will drop everything
             */
            gib(this: Byond.Mob.Living, drop_bitflags?: Bitflags.Drop): void;

            /** Can't go below remaining duration */
            Knockdown(
                this: Byond.Mob.Living,
                amount: number,
                daze_amount?: number,
                ignore_canstun?: Byond.Bool | boolean
            ): Byond.Datum.StatusEffect.Incapacitating.Knockdown | undefined;

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

                    equipOutfit(
                        this: Byond.Mob.Living.Carbon.Human,
                        outfit: Byond.Datum.Outfit | Byond.Type<Byond.Datum.Outfit>,
                        visuals_only?: Byond.Bool | boolean
                    ): Byond.Bool;
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
         * Used for changing icon states for different base sprites.
         */
        base_icon_state: string | undefined;

        resistance_flags: Bitflags.Resistance;

        add_overlay(
            this: Byond.Atom,
            overlays:
                | Byond.List<number, Byond.Atom | Byond.Icon | Byond.Image | Byond.Type | string>
                | Byond.Atom
                | Byond.Icon
                | Byond.Image
                | Byond.Type
                | string
        ): void;

        cut_overlay(
            this: Byond.Atom,
            overlays:
                | Byond.List<number, Byond.Atom | Byond.Icon | Byond.Image | Byond.Type | string>
                | Byond.Atom
                | Byond.Icon
                | Byond.Image
                | Byond.Type
                | string
        ): void;

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

        /**
         * Updates the appearence of the icon
         *
         * Mostly delegates to update_name, update_desc, and update_icon
         *
         * Arguments:
         * - updates: A set of bitflags dictating what should be updated. Defaults to [ALL]
         */
        update_appearance(this: Byond.Atom, updates?: Bitflags.Update): Bitflags.Update;
    }

    namespace Atom {
        interface Movable {
            last_move: Byond.Direction | undefined;

            get anchored(): Byond.Bool;
            set anchored(value: Byond.Bool | boolean);

            move_resist: number;

            move_force: number;

            pull_force: number;

            throwing: Byond.Datum.ThrownThing | undefined;

            /**
             * How many tiles to move per ds when being thrown. Float values are fully supported
             */
            throw_speed: number;

            throw_range: number;

            /**
             * Max range this atom can be thrown via telekinesis
             */
            tk_throw_range: number;

            pulledby: Byond.Mob | undefined;

            /**
             * What language holder type to init as
             */
            initial_language_holder: Byond.Type<Byond.Datum.LanguageHolder>;

            /**
             * The list of allies this atom has (used for anything too dynamic for string_list() - typically mob refs, each mob starts with themselves as an ally)
             */
            allies: Byond.List<number, string> | undefined;

            /**
             * Use get_default_say_verb() in say.dm instead of reading verb_say.
             */
            verb_say: string;

            verb_ask: string;

            verb_exclaim: string;

            verb_whisper: string;

            verb_sing: string;

            verb_yell: string;

            speech_span: string | undefined;

            /**
             * Are we moving with inertia? Mostly used as an optimization
             */
            get inertia_moving(): Byond.Bool;
            set inertia_moving(value: Byond.Bool | boolean);

            /**
             * Multiplies speed the movable drifts when unaffected by gravity.
             * "Passive" is used for referring "base drift speed" - only the smaller of the two are used.
             */
            inertia_move_multiplier_passive: number;

            /**
             * Multiplies speed the movable drifts when unaffected by gravity.
             * "Active" is used for referring to things boosting our drift speed, like jetpacks - only the smaller of the two are used.
             */
            inertia_move_multiplier_active: number;

            /**
             * Object "weight", higher weight reduces acceleration applied to the object
             */
            inertia_force_weight: number;

            /**
             * The last time we pushed off something
             * This is a hack to get around dumb him him me scenarios
             */
            last_pushoff: number | undefined;

            /**
             * Things we can pass through while moving. If any of this matches the thing we're trying to pass's [pass_flags_self], then we can pass through.
             */
            pass_flags: Bitflags.Pass;

            /**
             * If false makes [CanPass][/atom/proc/CanPass] call [CanPassThrough][/atom/movable/proc/CanPassThrough] on this type instead of using default behaviour
             */
            get generic_canpass(): Byond.Bool;
            set generic_canpass(value: Byond.Bool | boolean);

            /**
             * 0: not doing a diagonal move. 1 and 2: doing the first/second step of the diagonal move
             */
            moving_diagonally: Enums.DiagonalStep;

            /**
             * attempt to resume grab after moving instead of before.
             */
            moving_from_pull: Byond.Atom.Movable | undefined;

            /**
             * Holds information about any movement loops currently running/waiting to run on the movable. Lazy, will be null if nothing's going on
             */
            move_packet: Byond.Datum.MovementPacket | undefined;

            /**
             * an associative lazylist of relevant nested contents by "channel", the list is of the form: list(channel = list(important nested contents of that type))
             * each channel has a specific purpose and is meant to replace potentially expensive nested contents iteration.
             * do NOT add channels to this for little reason as it can add considerable memory usage.
             */
            important_recursive_contents: Byond.List<string, Byond.List<number, Byond.Atom.Movable>> | undefined;

            /**
             * contains every client mob corresponding to every client eye in this container. lazily updated by SSparallax and is sparse:
             * only the last container of a client eye has this list assuming no movement since SSparallax's last fire
             */
            client_mobs_in_contents: Byond.List<number, Byond.Mob> | undefined;

            /**
             * String representing the spatial grid groups we want to be held in.
             * acts as a key to the list of spatial grid contents types we exist in via SSspatial_grid.spatial_grid_categories.
             * We do it like this to prevent people trying to mutate them and to save memory on holding the lists ourselves
             */
            spatial_grid_key: string | undefined;

            /**
             * In case you have multiple types, you automatically use the most useful one.
             * IE: Skating on ice, flippers on water, flying over chasm/space, etc.
             * I recommend you use the movetype_handler system and not modify this directly, especially for living mobs.
             */
            movement_type: Bitflags.MovementType;

            pulling: Byond.Atom.Movable | undefined;

            grab_state: Enums.GrabLevel;

            /**
             * The strongest grab we can acomplish
             */
            max_grab: Enums.GrabLevel;

            throwforce: number;

            orbiting: Byond.Datum.Component.Orbiter | undefined;

            /**
             * is the mob currently ascending or descending through z levels?
             */
            currently_z_moving: Enums.CurrentlyZMoving | undefined;

            /**
             * Either [EMISSIVE_BLOCK_NONE], [EMISSIVE_BLOCK_GENERIC], or [EMISSIVE_BLOCK_UNIQUE]
             */
            blocks_emissive: Enums.EmissiveBlock;

            /**
             * Internal holder for emissive blocker object, do not use directly use blocks_emissive
             */
            em_block: Byond.Atom.Movable.RenderStep.EmissiveBlocker | undefined;

            /**
             * Lazylist to keep track on the sources of illumination.
             */
            affected_dynamic_lights: Byond.List<Byond.Datum, number> | undefined;

            /**
             * Highest-intensity light affecting us, which determines our visibility.
             */
            affecting_dynamic_lumi: number;

            /**
             * Whether this atom should have its dir automatically changed when it moves. Setting this to FALSE allows for things such as directional windows to retain dir on moving without snowflake code all of the place.
             */
            get set_dir_on_move(): Byond.Bool;
            set set_dir_on_move(value: Byond.Bool | boolean);

            /**
             * The degree of thermal insulation that mobs in list/contents have from the external environment, between 0 and 1
             */
            contents_thermal_insulation: number;

            /**
             * The degree of pressure protection that mobs in list/contents have from the external environment, between 0 and 1
             */
            contents_pressure_protection: number;

            /**
             * The voice that this movable makes when speaking
             */
            voice: string | undefined;

            /**
             * The pitch adjustment that this movable uses when speaking.
             */
            pitch: number;

            /**
             * The base set of blips to use for blip calculation.
             */
            blip_base: string;

            /**
             * The blip variant to use for blip calculation.
             */
            blip_number: string;

            /**
             * Datum that keeps all data related to zero-g drifting and handles related code/comsigs
             */
            drift_handler: Byond.Datum.DriftHandler | undefined;

            /**
             * The filter to apply to the voice when processing the TTS audio message.
             */
            voice_filter: string;

            /**
             * Set to anything other than "" to activate the silicon voice effect for TTS messages.
             */
            tts_silicon_voice_effect: string;

            /**
             * Value used to increment ex_act() if reactionary_explosions is on
             * How much we as a source block explosions by
             * Will not automatically apply to the turf below you, you need to apply /datum/element/block_explosives in conjunction with this
             */
            explosion_block: number;

            /**
             * List of accesses needed to use this object: The user must possess all accesses in this list in order to use the object.
             * Example: If req_access = list(ACCESS_ENGINE, ACCESS_CE)- then the user must have both ACCESS_ENGINE and ACCESS_CE in order to use the object.
             */
            req_access: Byond.List<number, string> | undefined;

            /**
             * List of accesses needed to use this object: The user must possess at least one access in this list in order to use the object.
             * Example: If req_one_access = list(ACCESS_ENGINE, ACCESS_CE)- then the user must have either ACCESS_ENGINE or ACCESS_CE in order to use the object.
             */
            req_one_access: Byond.List<number, string> | undefined;

            /**
             * Returns the faction list of this atom/movable
             */
            get_faction(this: Byond.Atom.Movable): Byond.List<number, string> | undefined;

            /**
             * Sets atom's faction list to be the provided list of faction strings. Returns TRUE if successful.
             */
            set_faction(
                this: Byond.Atom.Movable,
                factions: Byond.List<number, string> | readonly string[] | undefined
            ): Byond.Bool;

            /**
             * Adds a single faction string or list of faction strings to the atom's faction list. Returns TRUE if something was added.
             */
            add_faction(
                this: Byond.Atom.Movable,
                faction_or_factions: string | Byond.List<number, string> | readonly string[]
            ): Byond.Bool;

            /**
             * Removes a single faction string or list of faction strings from the atom's faction list. Returns TRUE if something was removed.
             */
            remove_faction(
                this: Byond.Atom.Movable,
                faction_or_factions: string | Byond.List<number, string> | readonly string[]
            ): Byond.Bool;

            /**
             * Returns TRUE if the faction or factions in list are in our faction list.
             * If match_all is set, we have to match everything in the provided list arg.
             */
            has_faction(
                this: Byond.Atom.Movable,
                faction_or_factions: string | Byond.List<number, string> | readonly string[],
                match_all?: Byond.Bool | boolean
            ): Byond.Bool;

            /**
             * What makes things... talk.
             *
             * * message - The message to say.
             * * bubble_type - The type of speech bubble to use when talking
             * * spans - A list of spans to attach to the message. Includes the atom's speech span by default
             * * sanitize - Should we sanitize the message? Only set to FALSE if you have ALREADY sanitized it
             * * language - The language to speak in. Defaults to the atom's selected language
             * * ignore_spam - Should we ignore spam checks?
             * * forced - What was it forced by? null if voluntary. (NOT a boolean!)
             * * filterproof - Do we bypass the filter when checking the message?
             * * message_range - The range of the message. Defaults to 7
             * * saymode - Saymode passed to the speech
             * This is usually set automatically and is only relevant for living mobs.
             * * message_mods - A list of message modifiers, i.e. whispering/singing.
             * Most of these are set automatically but you can pass in your own pre-say.
             */
            say(
                this: Byond.Atom.Movable,
                message: string,
                bubble_type?: string,
                spans?: Byond.List<number, string> | readonly string[],
                sanitize?: Byond.Bool | boolean,
                language?: Byond.Datum.Language,
                ignore_spam?: Byond.Bool | boolean,
                forced?: string,
                filterproof?: Byond.Bool | boolean,
                message_range?: number,
                saymode?: Byond.Datum.Saymode,
                message_mods?: Byond.List<string, string>
            ): void;

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

            /** If this returns FALSE then callback will not be called. */
            throw_at(
                this: Byond.Atom.Movable,
                target: Byond.Atom,
                range: number,
                speed: number,
                thrower?: Byond.Atom,
                spin?: Byond.Bool | boolean,
                diagonals_first?: Byond.Bool | boolean,
                callback?: Byond.Datum.Callback,
                force?: number,
                gentle?: Byond.Bool | boolean,
                quickstart?: Byond.Bool | boolean,
                throw_datum_typepath?: Byond.Type<Byond.Datum.ThrownThing>
            ): Byond.Bool;
        }

        namespace Movable {
            class RenderStep extends Byond.Atom.Movable {}

            namespace RenderStep {
                class EmissiveBlocker extends Byond.Atom.Movable.RenderStep {}
            }
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
            class Bodypart extends Byond.Obj.Item {
                /**
                 * Random flags that describe this bodypart
                 */
                bodypart_flags: Bitflags.Bodypart;
            }

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

            class Implanter extends Byond.Obj.Item {
                /**
                 * The implant currently loaded in the implanter.
                 */
                imp: Byond.Obj.Item.Implant | undefined;
            }

            class Implant extends Byond.Obj.Item {
                /**
                 * The mob that's implanted with this.
                 */
                imp_in: Byond.Mob.Living | undefined;
                /**
                 * If false, upon implantation of a duplicate implant, an attempt to combine the new implant's uses with the old one's uses will be made.
                 */
                get allow_multiple(): Byond.Bool;
                set allow_multiple(value: Byond.Bool | boolean);
                /**
                 * How many times this can do something. -1 for unlimited.
                 */
                uses: number;
                /**
                 * Our implant flags.
                 */
                implant_flags: number;
                /**
                 * Implant color, used for selecting either the "b" version or the "r" version of the implant case sprite.
                 */
                implant_color: string;
                /**
                 * what icon state will we represent ourselves with on the hud?
                 */
                hud_icon_state: string | undefined;
                /**
                 * What's the most important info that we really, really care about, e.g. name, lifespan-after-death, utility?
                 */
                implant_info: string;
                /**
                 * What's the extended lore for this implant that we might not care that much about, e.g. descriptions, flavortext?
                 */
                implant_lore: string;

                activate(this: Byond.Obj.Item.Implant): void;

                /**
                 * What does the implant do upon injection?
                 *
                 * return true if the implant injects
                 * return false if there is no room for implant / it fails
                 * Arguments:
                 * * mob/living/target - mob being implanted
                 * * mob/user - mob doing the implanting
                 * * silent - unused here
                 * * force - if true, implantation will not fail if can_be_implanted_in returns false
                 */
                implant(
                    this: Byond.Obj.Item.Implant,
                    target: Byond.Mob.Living,
                    user: Byond.Mob,
                    silent?: Byond.Bool | boolean,
                    force?: Byond.Bool | boolean
                ): Byond.Bool | undefined;
            }

            class Gun extends Byond.Obj.Item {}

            namespace Gun {
                class Energy extends Byond.Obj.Item.Gun {}

                namespace Energy {
                    class Laser extends Byond.Obj.Item.Gun.Energy {}
                }
            }

            class Storage extends Byond.Obj.Item {}

            namespace Storage {
                class Backpack extends Byond.Obj.Item.Storage {}

                class Medkit extends Byond.Obj.Item.Storage {}

                namespace Medkit {
                    class TacticalLite extends Byond.Obj.Item.Storage.Medkit {}
                }
            }

            class Defibrillator extends Byond.Obj.Item {}

            namespace Defibrillator {
                class Compact extends Byond.Obj.Item.Defibrillator {}

                namespace Compact {
                    class Loaded extends Byond.Obj.Item.Defibrillator.Compact {}
                }
            }

            class Card extends Byond.Obj.Item {
                /**
                 * Cached icon that has been built for this card. Intended to be displayed in chat. Cardboards IDs and actual IDs use it.
                 */
                cached_flat_icon: Byond.Icon | undefined;
                /**
                 * What is our honorific name/title combo to be displayed?
                 */
                honorific_title: string | undefined;
            }

            namespace Card {
                class Id extends Byond.Obj.Item.Card {
                    /**
                     * The name registered on the card (for example: Dr Bryan See)
                     */
                    registered_name: string | undefined;
                    /**
                     * Linked bank account.
                     */
                    registered_account: Byond.Datum.BankAccount | undefined;
                    /**
                     * Linked holopay.
                     */
                    my_store: Byond.Obj.Structure.Holopay | undefined;
                    /**
                     * Cooldown between projecting holopays
                     */
                    last_holopay_projection: number;
                    /**
                     * List of logos available for holopay customization - via font awesome 5
                     */
                    available_logos: Byond.List<number, string>;
                    /**
                     * Replaces the "pay whatever" functionality with a set amount when non-zero.
                     */
                    holopay_fee: number;
                    /**
                     * The holopay icon chosen by the user
                     */
                    holopay_logo: string;
                    /**
                     * Maximum forced fee. It's unlikely for a user to encounter this type of money, much less pay it willingly.
                     */
                    holopay_max_fee: number;
                    /**
                     * Minimum forced fee for holopay stations. Registers as "pay what you want."
                     */
                    holopay_min_fee: number;
                    /**
                     * The holopay name chosen by the user
                     */
                    holopay_name: string;
                    /**
                     * Registered owner's age.
                     */
                    registered_age: number;
                    /**
                     * The job name registered on the card (for example: Assistant).
                     */
                    assignment: string | undefined;
                    /**
                     * Trim datum associated with the card. Controls which job icon is displayed on the card and which accesses do not require wildcards.
                     */
                    trim: Byond.Type<Byond.Datum.IdTrim> | undefined;
                    /**
                     * Whether the trim on this card can be changed.
                     */
                    get trim_changeable(): Byond.Bool;
                    set trim_changeable(value: Byond.Bool | boolean);
                    /**
                     * Access levels held by this card.
                     */
                    access: Byond.List<number, string>;
                    /**
                     * List of wildcard slot names as keys with lists of wildcard data as values.
                     */
                    wildcard_slots: Byond.List<string, Byond.List<string, unknown>>;
                    /**
                     * Boolean value. If TRUE, the [Intern] tag gets prepended to this ID card when the label is updated.
                     */
                    get is_intern(): Byond.Bool;
                    set is_intern(value: Byond.Bool | boolean);
                    /**
                     * If true, the wearer will have bigger arrow when pointing at things. Passed down by trims.
                     */
                    get big_pointer(): Byond.Bool;
                    set big_pointer(value: Byond.Bool | boolean);
                    /**
                     * If set, the arrow will have a different color.
                     */
                    pointer_color: string | undefined;
                    /**
                     * Will this ID card use the first or last name as the name displayed with the honorific?
                     */
                    honorific_position: Enums.HonorificPosition;
                    /**
                     * What is our selected honorific?
                     */
                    chosen_honorific: string | undefined;
                }
            }
        }

        class Projectile extends Byond.Obj {}

        class Effect extends Byond.Obj {}

        namespace Effect {
            class Overlay extends Byond.Obj.Effect {}

            namespace Overlay {
                /**
                 * Door overlay for animating closets
                 */
                class ClosetDoor extends Byond.Obj.Effect.Overlay {}
            }

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

        class Structure extends Byond.Obj {
            get broken(): Byond.Bool;
            set broken(value: Byond.Bool | boolean);
        }

        namespace Structure {
            class Barricade extends Byond.Obj.Structure {}

            namespace Barricade {
                class Wooden extends Byond.Obj.Structure.Barricade {}

                namespace Wooden {
                    class Crude extends Byond.Obj.Structure.Barricade.Wooden {}
                }
            }

            class Window extends Byond.Obj.Structure {}

            /**
             * A lavaland geyser that spawns chems and can be mining scanned for points. Made to work with the plumbing pump to extract that sweet rare nectar
             */
            class Geyser extends Byond.Obj.Structure {
                /**
                 * set to null to get it greyscaled from "[icon_state]_soup". Not very usable with the whole random thing, but more types can be added if you change the spawn prob
                 */
                erupting_state: string | undefined;
                /**
                 * what chem do we produce?
                 */
                reagent_id: Byond.Type<Byond.Datum.Reagent>;
                /**
                 * how much reagents we add every process (2 seconds)
                 */
                potency: number;
                /**
                 * maximum volume
                 */
                max_volume: number;
                /**
                 * Have we been discovered with a mining scanner?
                 */
                get discovered(): Byond.Bool;
                set discovered(value: Byond.Bool | boolean);
                /**
                 * How many points we grant to whoever discovers us
                 */
                point_value: number;
                /**
                 * what's our real name that will show upon discovery? null to do nothing
                 */
                true_name: string | undefined;
                /**
                 * the message given when you discover this geyser.
                 */
                discovery_message: string | undefined;
            }

            class Holopay extends Byond.Obj.Structure {
                /**
                 * ID linked to the holopay
                 */
                linked_card: Byond.Obj.Item.Card.Id | undefined;
                /**
                 * Max range at which the hologram can be projected before it deletes
                 */
                max_holo_range: number;
                /**
                 * The holopay shop icon displayed in the UI
                 */
                shop_logo: string;
                /**
                 * Replaces the "pay whatever" functionality with a set amount when non-zero.
                 */
                force_fee: number;
            }

            class Closet extends Byond.Obj.Structure {
                /**
                 * The overlay for the closet's door
                 */
                door_obj: Byond.Obj.Effect.Overlay.ClosetDoor | undefined;
                /**
                 * Whether or not this door is being animated
                 */
                get is_animating_door(): Byond.Bool;
                set is_animating_door(value: Byond.Bool | boolean);
                /**
                 * Vertical squish of the door
                 */
                door_anim_squish: number;
                /**
                 * The maximum angle the door will be drawn at
                 */
                door_anim_angle: number;
                /**
                 * X position of the closet door hinge, relative to the center of the sprite
                 */
                door_hinge_x: number;
                /**
                 * Amount of time it takes for the door animation to play
                 *
                 * set to 0 to make the door not animate at all
                 */
                door_anim_time: number;
                /**
                 * Paint jobs for this closet, crates are a subtype of closet so they override these values
                 */
                paint_jobs: Byond.List<string, Byond.List<string, string>> | Byond.Bool | undefined;
                /**
                 * Controls whether a door overlay should be applied using the icon_door value as the icon state
                 */
                get enable_door_overlay(): Byond.Bool;
                set enable_door_overlay(value: Byond.Bool | boolean);
                get has_opened_overlay(): Byond.Bool;
                set has_opened_overlay(value: Byond.Bool | boolean);
                get has_closed_overlay(): Byond.Bool;
                set has_closed_overlay(value: Byond.Bool | boolean);
                icon_door: string | undefined;
                get opened(): Byond.Bool;
                set opened(value: Byond.Bool | boolean);
                get welded(): Byond.Bool;
                set welded(value: Byond.Bool | boolean);
                get locked(): Byond.Bool;
                set locked(value: Byond.Bool | boolean);
                /**
                 * never solid (You can always pass over it)
                 */
                get wall_mounted(): Byond.Bool;
                set wall_mounted(value: Byond.Bool | boolean);
                breakout_time: number;
                message_cooldown: number | undefined;
                get can_weld_shut(): Byond.Bool;
                set can_weld_shut(value: Byond.Bool | boolean);
                get horizontal(): Byond.Bool;
                set horizontal(value: Byond.Bool | boolean);
                get allow_objects(): Byond.Bool;
                set allow_objects(value: Byond.Bool | boolean);
                get allow_dense(): Byond.Bool;
                set allow_dense(value: Byond.Bool | boolean);
                /**
                 * if it's dense when open or not
                 */
                get dense_when_open(): Byond.Bool;
                set dense_when_open(value: Byond.Bool | boolean);
                /**
                 * Biggest mob_size accepted by the container
                 */
                max_mob_size: Enums.MobSize;
                /**
                 * how many human sized mob/living can fit together inside a closet.
                 */
                mob_storage_capacity: number;
                /**
                 * This is so that someone can't pack hundreds of items in a locker/crate then open it in a populated area to crash clients.
                 */
                storage_capacity: number;
                cutting_tool: Byond.Type<Byond.Obj.Item>;
                open_sound: Byond.Sound;
                close_sound: Byond.Sound;
                lock_sound: Byond.Sound;
                unlock_sound: Byond.Sound;
                open_sound_volume: number;
                close_sound_volume: number;
                material_drop: Byond.Type<Byond.Obj.Item>;
                material_drop_amount: number;
                /**
                 * which icon to use when packagewrapped. null to be unwrappable.
                 */
                delivery_icon: string | undefined;
                get anchorable(): Byond.Bool;
                set anchorable(value: Byond.Bool | boolean);
                icon_welded: string;
                icon_broken: string;
                /**
                 * Whether a skittish person can dive inside this closet. Disable if opening the closet causes "bad things" to happen or that it leads to a logical inconsistency.
                 */
                get divable(): Byond.Bool;
                set divable(value: Byond.Bool | boolean);
                /**
                 * secure locker or not, also used if overriding a non-secure locker with a secure door overlay to add fancy lights
                 */
                get secure(): Byond.Bool;
                set secure(value: Byond.Bool | boolean);
                get can_install_electronics(): Byond.Bool;
                set can_install_electronics(value: Byond.Bool | boolean);
                get is_maploaded(): Byond.Bool;
                set is_maploaded(value: Byond.Bool | boolean);
                get contents_initialized(): Byond.Bool;
                set contents_initialized(value: Byond.Bool | boolean);
                /**
                 * is this closet locked by an exclusive id, i.e. your own personal locker
                 */
                id_card: Byond.Datum.Weakref<Byond.Obj.Item.Card.Id> | undefined;
                /**
                 * should we prevent further access change
                 */
                get access_locked(): Byond.Bool;
                set access_locked(value: Byond.Bool | boolean);
                /**
                 * is the card reader installed in this machine
                 */
                get card_reader_installed(): Byond.Bool;
                set card_reader_installed(value: Byond.Bool | boolean);
                /**
                 * access types for card reader
                 */
                access_choices: Byond.List<number, string>;
                /**
                 * Whether this closet is sealed or not. If sealed, it'll have its own internal air
                 */
                get sealed(): Byond.Bool;
                set sealed(value: Byond.Bool | boolean);
                /**
                 * Internal gas for this closet.
                 */
                internal_air: Byond.Datum.GasMixture | undefined;
                /**
                 * Volume of the internal air
                 */
                air_volume: number;
                /**
                 * How many pixels the closet can shift on the x axis when shaking
                 */
                x_shake_pixel_shift: number;
                /**
                 * how many pixels the closet can shift on the y axes when shaking
                 */
                y_shake_pixel_shift: number;

                open(
                    this: Byond.Obj.Structure.Closet,
                    user?: Byond.Mob.Living,
                    force?: Byond.Bool | boolean,
                    special_effects?: Byond.Bool | boolean
                ): Byond.Bool;

                close(this: Byond.Obj.Structure.Closet, user?: Byond.Mob.Living): Byond.Bool;

                /**
                 * Toggles a closet open or closed, to the opposite state. Does not respect locked or welded states, however.
                 */
                toggle(this: Byond.Obj.Structure.Closet, user?: Byond.Mob.Living): Byond.Bool;

                can_open(
                    this: Byond.Obj.Structure.Closet,
                    user?: Byond.Mob.Living,
                    force?: Byond.Bool | boolean
                ): Byond.Bool;

                can_close(this: Byond.Obj.Structure.Closet, user?: Byond.Mob.Living): Byond.Bool;

                insert(
                    this: Byond.Obj.Structure.Closet,
                    inserted: Byond.Atom.Movable,
                    mapload?: Byond.Bool | boolean
                ): Byond.Bool | -1;

                insertion_allowed(this: Byond.Obj.Structure.Closet, movable: Byond.Atom.Movable): Byond.Bool;

                take_contents(this: Byond.Obj.Structure.Closet, mapload?: Byond.Bool | boolean): void;

                /**
                 * toggles the lock state of a closet
                 */
                lock(this: Byond.Obj.Structure.Closet): void;

                /**
                 * unlocks the closet
                 */
                unlock(this: Byond.Obj.Structure.Closet): void;

                togglelock(
                    this: Byond.Obj.Structure.Closet,
                    user?: Byond.Mob.Living,
                    silent?: Byond.Bool | boolean
                ): Byond.Bool;

                bust_open(this: Byond.Obj.Structure.Closet): void;

                set_access(
                    this: Byond.Obj.Structure.Closet,
                    accesses: Byond.List<number, string> | readonly string[]
                ): void;
            }

            namespace Closet {
                class Crate extends Byond.Obj.Structure.Closet {}

                namespace Crate {
                    class Secure extends Byond.Obj.Structure.Closet.Crate {}

                    namespace Secure {
                        /**
                         * for consistency with other "freezer" closets/crates
                         */
                        class Freezer extends Byond.Obj.Structure.Closet.Crate.Secure {}

                        class Gear extends Byond.Obj.Structure.Closet.Crate.Secure {}
                    }
                }

                class Supplypod extends Byond.Obj.Structure.Closet {}

                namespace Supplypod {
                    class Podspawn extends Byond.Obj.Structure.Closet.Supplypod {}
                }
            }
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

    /**
     * These defines are used specifically with the atom/pass_flags bitmask
     * the atom/checkpass() proc uses them (tables will call movable atom checkpass(PASSTABLE) for example)
     */
    namespace Pass {
        /** Allows you to pass over tables. */
        type Table = 1;
        /** Allows you to pass over glass(this generally includes anything see-through that's glass-adjacent, ie. windows, windoors, airlocks with glass, etc.) */
        type Glass = 2;
        /** Allows you to pass over grilles. */
        type Grille = 4;
        /** Allows you to pass over blob tiles. */
        type Blob = 8;
        /** Allows you to pass over mobs. */
        type Mob = 16;
        /** Allows you to pass over closed turfs, ie. walls. */
        type ClosedTurf = 32;
        /** Let thrown things past us. **ONLY MEANINGFUL ON pass_flags_self!** */
        type LetPassThrow = 64;
        /** Allows you to pass over machinery, ie. vending machines, computers, protolathes, etc. */
        type Machine = 128;
        /** Allows you to pass over structures, ie. racks, tables(if you don't already have PASSTABLE), etc. */
        type Structure = 256;
        /** Allows you to pass over plastic flaps, often found at cargo or MULE dropoffs. */
        type Flaps = 512;
        /** Allows you to pass over airlocks and mineral doors. */
        type Doors = 1024;
        /** Allows you to pass over vehicles, ie. mecha, secways, the pimpin' ride, etc. */
        type Vehicle = 2048;
        /** Allows you to pass over dense items. */
        type Item = 4096;
        /** Do not intercept click attempts during Adjacent() checks. See [turf/proc/ClickCross]. **ONLY MEANINGFUL ON pass_flags_self!** */
        type LetPassClicks = 8192;
        /** Allows you to pass over windows and window-adjacent stuff, like windows and windoors. Does not include airlocks with glass in them. */
        type Window = 16384;
    }

    type Pass = Bitflag<
        [
            Bitflags.Pass.Table,
            Bitflags.Pass.Glass,
            Bitflags.Pass.Grille,
            Bitflags.Pass.Blob,
            Bitflags.Pass.Mob,
            Bitflags.Pass.ClosedTurf,
            Bitflags.Pass.LetPassThrow,
            Bitflags.Pass.Machine,
            Bitflags.Pass.Structure,
            Bitflags.Pass.Flaps,
            Bitflags.Pass.Doors,
            Bitflags.Pass.Vehicle,
            Bitflags.Pass.Item,
            Bitflags.Pass.LetPassClicks,
            Bitflags.Pass.Window,
        ]
    >;

    /**
     * Fire and Acid stuff, for resistance_flags
     */
    namespace Resistance {
        type LavaProof = 1;
        /** 100% immune to fire damage (but not necessarily to lava or heat) */
        type FireProof = 2;
        /** atom is flammable and can have the burning component */
        type Flammable = 4;
        /** currently burning */
        type OnFire = 8;
        /** acid can't even appear on it, let alone melt it. */
        type Unacidable = 16;
        /** acid stuck on it doesn't melt it. */
        type AcidProof = 32;
        /** doesn't take damage */
        type Indestructible = 64;
        /** can't be frozen */
        type FreezeProof = 128;
        /** can't be shuttle crushed. */
        type ShuttleCrushProof = 256;
        /** can't be destroyed by bombs */
        type BombProof = 512;
    }

    type Resistance = Bitflag<
        [
            Bitflags.Resistance.LavaProof,
            Bitflags.Resistance.FireProof,
            Bitflags.Resistance.Flammable,
            Bitflags.Resistance.OnFire,
            Bitflags.Resistance.Unacidable,
            Bitflags.Resistance.AcidProof,
            Bitflags.Resistance.Indestructible,
            Bitflags.Resistance.FreezeProof,
            Bitflags.Resistance.ShuttleCrushProof,
            Bitflags.Resistance.BombProof,
        ]
    >;

    namespace MovementType {
        type Ground = 1;
        type Flying = 2;
        type Ventcrawling = 4;
        type Floating = 8;
        /** When moving, will Cross() everything, but won't stop or Bump() anything. */
        type Phasing = 16;
        /** The mob is walking on the ceiling. Or is generally just, upside down. */
        type UpsideDown = 32;
    }

    type MovementType = Bitflag<
        [
            Bitflags.MovementType.Ground,
            Bitflags.MovementType.Flying,
            Bitflags.MovementType.Ventcrawling,
            Bitflags.MovementType.Floating,
            Bitflags.MovementType.Phasing,
            Bitflags.MovementType.UpsideDown,
        ]
    >;

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

    namespace Drop {
        /** Mobs will drop a brain */
        type Brain = 1;
        /** Mobs will drop organs */
        type Organs = 2;
        /** Mobs will drop bodyparts (arms, legs, etc.) */
        type Bodyparts = 4;
        /** Mobs will drop items */
        type Items = 8;
    }

    type Drop = Bitflag<[Bitflags.Drop.Brain, Bitflags.Drop.Organs, Bitflags.Drop.Bodyparts, Bitflags.Drop.Items]>;

    namespace Status {
        /** If set, this mob can be stunned. */
        type CanStun = 1;
        /** If set, this mob can be knocked down */
        type CanKnockdown = 2;
        /**
         * If set, this mob can be knocked unconscious via status effect.
         * NOTE, does not mean immune to sleep. Unconscious and sleep are two different things.
         * NOTE, does not relate to the unconscious trait either. Only the status effect.
         */
        type CanUnconscious = 4;
        /** If set, this mob can be grabbed or pushed when bumped into */
        type CanPush = 8;
    }

    type Status = Bitflag<
        [Bitflags.Status.CanStun, Bitflags.Status.CanKnockdown, Bitflags.Status.CanUnconscious, Bitflags.Status.CanPush]
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

    namespace Bodypart {
        /** Bodypart cannot be dismembered or amputated */
        type Unremovable = 1;
        /** Bodypart is a pseudopart (like a chainsaw arm) */
        type Pseudopart = 2;
        /** Bodypart did not match the owner's default bodypart limb_id when surgically implanted */
        type Implanted = 4;
        /** Bodypart never displays as a husk */
        type Unhuskable = 8;
        /** Bodypart has never been added to a mob */
        type Virgin = 16;
        /** Not a full bodypart, but in fact is part of a missing limb */
        type Stump = 32;
    }

    type Bodypart = Bitflag<
        [
            Bitflags.Bodypart.Unremovable,
            Bitflags.Bodypart.Pseudopart,
            Bitflags.Bodypart.Implanted,
            Bitflags.Bodypart.Unhuskable,
            Bitflags.Bodypart.Virgin,
            Bitflags.Bodypart.Stump,
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

    namespace Update {
        type Name = 1;
        type Desc = 2;
        type IconState = 4;
        type Overlays = 8;
        type Greyscale = 16;
        type Smoothing = 32;
        type Icon = 12; // IconState | Overlays
    }

    type Update = Bitflag<
        [Bitflags.Update.Name, Bitflags.Update.Desc, Bitflags.Update.IconState, Bitflags.Update.Overlays]
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

    enum ItemSlot {
        /**
         * Suit slot (armors, costumes, space suits, etc.)
         */
        OClothing = 1 << 0,
        /**
         * Jumpsuit slot
         */
        IClothing = 1 << 1,
        /**
         * Glove slot
         */
        Gloves = 1 << 2,
        /**
         * Glasses slot
         */
        Eyes = 1 << 3,
        /**
         * Ear slot (radios, earmuffs)
         */
        Ears = 1 << 4,
        /**
         * Mask slot
         */
        Mask = 1 << 5,
        /**
         * Head slot (helmets, hats, etc.)
         */
        Head = 1 << 6,
        /**
         * Shoe slot
         */
        Feet = 1 << 7,
        /**
         * ID slot
         */
        Id = 1 << 8,
        /**
         * Belt slot
         */
        Belt = 1 << 9,
        /**
         * Back slot
         */
        Back = 1 << 10,
        /**
         * Dextrous simplemob "hands" (used for Drones and Dextrous Guardians)
         */
        DexStorage = 1 << 11,
        /**
         * Neck slot (ties, bedsheets, scarves)
         */
        Neck = 1 << 12,
        /**
         * A character's hand slots
         */
        Hands = 1 << 13,
        /**
         * Suit Storage slot
         */
        SuitStore = 1 << 14,
        /**
         * Left Pocket slot
         */
        LPocket = 1 << 15,
        /**
         * Right Pocket slot
         */
        RPocket = 1 << 16,
        /**
         * Handcuff slot
         */
        Handcuffed = 1 << 17,
        /**
         * Legcuff slot (bolas, beartraps)
         */
        Legcuffed = 1 << 18,
    }

    enum GrabLevel {
        Passive = 0,
        Aggressive = 1,
        Neck = 2,
        Kill = 3,
    }

    /**
     * Sizes of mobs, used by mob/living/var/mob_size
     */
    enum MobSize {
        Tiny = 0,
        Small = 1,
        Human = 2,
        Large = 3,
        /**
         * Use this for things you don't want bluespace body-bagged
         */
        Huge = 4,
    }

    enum EmissiveBlock {
        /**
         * Uses vis_overlays to leverage caching so that very few new items need to be made for the overlay. For anything that doesn't change outline or opaque area much or at all.
         */
        Generic = 0,
        /**
         * Uses a dedicated render_target object to copy the entire appearance in real time to the blocking layer. For things that can change in appearance a lot from the base state, like humans.
         */
        Unique = 1,
        /**
         * Don't block any emissives. Useful for things like, pieces of paper?
         */
        None = 2,
    }

    /**
     * currently_z_moving defines. Higher numbers mean higher priority.
     */
    enum CurrentlyZMoving {
        /**
         * This one is for falling down open space from stuff such as deleted tile, pit grate...
         */
        Falling = 1,
        /**
         * currently_z_moving is set to this in zMove() if 0.
         */
        MovingGeneric = 2,
        /**
         * This one is for falling down open space from movement.
         */
        FallingFromMove = 3,
        /**
         * This one is for going upstairs.
         */
        Ascending = 4,
    }

    /**
     * Diagonal movement is split into two cardinal moves
     */
    enum DiagonalStep {
        None = 0,
        /**
         * The first step of the diagnonal movement
         */
        First = 1,
        /**
         * The second step of the diagnonal movement
         */
        Second = 2,
    }

    enum HonorificPosition {
        /**
         * Honorific will display next to the first name.
         */
        First = 1 << 0,
        /**
         * Honorific will display next to the last name.
         */
        Last = 1 << 1,
        /**
         * Honorific will not be displayed.
         */
        None = 1 << 2,
        /**
         * Honorific will be appended to the full name at the start.
         */
        FirstFull = 1 << 3,
        /**
         * Honorific will be appended to the full name at the end.
         */
        LastFull = 1 << 4,
    }

    type BodyZone = "head" | "chest" | "l_arm" | "r_arm" | "l_leg" | "r_leg";
    type BodyZonePrecise = "eyes" | "mouth" | "groin" | "l_hand" | "r_hand" | "l_foot" | "r_foot";
    type BodyZoneAll = BodyZone | BodyZonePrecise;
}
