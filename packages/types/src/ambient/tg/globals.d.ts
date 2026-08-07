/// <reference path="../../index.d.ts" />
/// <reference path="types.d.ts" />

declare interface GlobalVars {
    SSdcs: SS13.SSdcs;
    SSfastprocess: SS13.SSfastprocess;
    SSlua: SS13.SSlua;
    SSmapping: SS13.SSmapping;
    SSmobs: SS13.SSmobs;
    SSspatial_grid: SS13.SSspatial_grid;
    SSpolling: SS13.SSpolling;

    GLOB: {
        cardinals: Byond.List<number, Byond.Direction.Cardinal>;
        mob_living_list: Byond.List<number, Byond.Mob.Living>;
        /**
         * all ckeys with associated client
         */
        directory: Byond.List<string, Byond.Client>;
        glide_size_multiplier: number;
    };
}

/**
 * Global procs are functions that are available globally, and can be called from
 * any context without needing to reference a specific object.
 *
 * To extends this interface, you can use the following pattern:
 *
 * @example
 * ```ts
 * declare global {
 *     `/** @noSelf * /` // without the space between `* /` and remove backticks
 *     interface GlobalProcs {
 *         my_custom_proc(arg1: string, arg2: number): void;
 *     }
 * }
 *
 * @noSelf
 */
declare interface GlobalProcs {
    REF(thing: Byond.Datum): string;
    _has_trait(target: Byond.Datum, trait: string): Byond.Bool;
    _prob(chance: number): Byond.Bool;
    _locate(x: number, y: number, z: number): Byond.Turf;
    _block(point1: Byond.Turf, point2: Byond.Turf): Byond.List<number, Byond.Turf>;
    to_chat(user: Byond.Datum, message: string): void;
    trim(string: string): string;
    _copytext(text: string, from: number, to: number): string;
    relay_to_list_and_observers(
        message: string,
        mob_list: Byond.List<number, Byond.Mob> | Byond.Mob[],
        source: Byond.Atom,
        message_type?: number
    ): void;

    _add_trait(target: Byond.Datum, trait: string, source: string): void;
    _remove_trait(target: Byond.Datum, trait: string, source: string): void;

    /** Direction `0` is the standard shorthand for "the turf `ref` is standing on". */
    _get_step(ref: Byond.Atom, direction: Byond.Direction | 0): Byond.Turf | undefined;
    _get_dir(from: Byond.Atom, to: Byond.Atom): Byond.Direction;
    _get_dist(from: Byond.Atom, to: Byond.Atom): number;
    _turn(direction: Byond.Direction, angle: number): Byond.Direction;
    _animate(target: Byond.Atom, set_vars: Record<string, unknown>, time?: number, loop?: number): void;
    _rect_turfs(h_radius: number, v_radius: number, center: Byond.Atom): Byond.List<number, Byond.Turf>;

    /**
     * Returns a list of movable atoms that are hearing sensitive in view_radius and line of sight to source
     * the majority of the work is passed off to the spatial grid if view_radius > 0
     * because view() isnt a raycasting algorithm, this does not hold symmetry to it. something in view might not be hearable with this.
     * if you want that use get_hearers_in_view() - however thats significantly more expensive
     *
     * * view_radius - what radius search circle we are using, worse performance as this increases but not as much as it used to
     * * source - object at the center of our search area. everything in get_turf(source) is guaranteed to be part of the search area
     */
    get_hearers_in_LOS(
        view_radius: number,
        source: Byond.Atom,
        contents_type?:
            | "recursive_contents_area_sensitive"
            | "recursive_contents_hearing_sensitive"
            | "recursive_contents_client_mobs"
            | "recursive_contents_active_storage"
    ): Byond.List<number, Byond.Atom.Movable> | undefined;

    /**
     * Returns the atom sitting on the turf.
     * For example, using this on a disk, which is in a bag, on a mob,
     * will return the mob because it's on the turf.
     *
     * Arguments
     * * something_in_turf - a movable within the turf, somewhere.
     * * stop_type - stops looking if stop_type is found in the turf, returning that type (if found).
     * * return_any - if set to TRUE, will return last movable found even if its not of the passed type
     */
    get_atom_on_turf(
        something_in_turf: Byond.Atom.Movable,
        stop_type?: Byond.Type,
        return_any?: Byond.Bool | boolean
    ): Byond.Atom.Movable;

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
            | "recursive_contents_active_storage"
    ): Byond.List<number, Byond.Atom.Movable> | undefined;

    /**
     * Runs byond's html encoding sanitization proc, after replacing new-lines and tabs for the # character.
     */
    sanitize(text: string): string;

    _pick_list<T>(list: readonly [T, ...T[]]): T;
    _pick_list<T>(list: Byond.List<number, T> | readonly T[]): T | undefined;
    // _pick_list<T>(list: Byond.List<T, unknown>): T | undefined;

    message_admins(msg: string): void;

    /**
     * Makes a given atom explode.
     *
     * Arguments:
     * - [origin][/atom]: The atom that's exploding.
     * - devastation_range: The range at which the effects of the explosion are at their strongest.
     * - heavy_impact_range: The range at which the effects of the explosion are relatively severe.
     * - light_impact_range: The range at which the effects of the explosion are relatively weak.
     * - flash_range: The range at which the explosion flashes people.
     * - adminlog: Whether to log the explosion/report it to the administration.
     * - ignorecap: Whether to ignore the relevant bombcap. Defaults to FALSE.
     * - flame_range: The range at which the explosion should produce hotspots.
     * - silent: Whether to generate/execute sound effects.
     * - smoke: Whether to generate a smoke cloud provided the explosion is powerful enough to warrant it.
     * - protect_epicenter: Whether to leave the epicenter turf unaffected by the explosion
     * - explosion_cause: [Optional] The atom that caused the explosion, when different to the origin. Used for logging.
     * - explosion_direction: The angle in which the explosion is pointed (for directional explosions.)
     * - explosion_arc: The angle of the arc covered by a directional explosion (if 360 the explosion is non-directional.)
     */
    explosion(
        origin: Byond.Atom,
        devastation_range?: number,
        heavy_impact_range?: number,
        light_impact_range?: number,
        flame_range?: number,
        flash_range?: number,
        adminlog?: Byond.Bool | boolean,
        ignorecap?: Byond.Bool | boolean,
        silent?: Byond.Bool | boolean,
        smoke?: Byond.Bool | boolean,
        protect_epicenter?: Byond.Bool | boolean,
        explosion_cause?: Byond.Atom,
        explosion_direction?: number,
        explosion_arc?: number
    ): void;

    key_name_admin(
        whom: Byond.Mob | Byond.Client | string | Byond.Datum.Mind | Byond.Atom | Byond.Datum,
        include_name?: Byond.Bool | boolean
    ): string;

    /**
     * Creates a TGUI window with a text input. Returns the user's response.
     *
     * This proc should be used to create windows for text entry that the caller will wait for a response from.
     * If tgui fancy chat is turned off: Will return a normal input. If max_length is specified, will return
     * stripped_multiline_input.
     *
     * Arguments:
     * * user - The user to show the text input to.
     * * message - The content of the text input, shown in the body of the TGUI window.
     * * title - The title of the text input modal, shown on the top of the TGUI window.
     * * default - The default (or current) value, shown as a placeholder.
     * * max_length - Specifies a max length for input. By default is infinity.
     * * multiline -  Bool that determines if the input box is much larger. Good for large messages, laws, etc.
     * * encode - Toggling this determines if input is filtered via html_encode. Setting this to FALSE gives raw input.
     * * timeout - The timeout of the textbox, after which the modal will close and qdel itself. Set to zero for no timeout.
     *
     * @blocking
     */
    tgui_input_text(
        user: Byond.Mob | Byond.Client,
        message: string,
        title?: string,
        default_?: string,
        max_length?: number,
        multiline?: Byond.Bool | boolean,
        encode?: Byond.Bool | boolean,
        timeout?: number,
        ui_state?: unknown
    ): string | undefined;

    /**
     * Creates a TGUI window with a list input. Returns the user's selected entry, or undefined if they cancelled.
     *
     * Arguments:
     * * user - The user to show the list input to.
     * * message - The content of the list input, shown in the body of the TGUI window.
     * * title - The title of the list input modal, shown on the top of the TGUI window.
     * * items - The list of selectable options.
     * * default - The default (or current) value, pre-selected in the list.
     * * timeout - The timeout of the list, after which the modal will close and qdel itself. Set to zero for no timeout.
     * * ui_state - The UI state for access checking.
     *
     * @blocking
     */
    tgui_input_list<T extends string>(
        user: Byond.Mob | Byond.Client,
        message: string,
        title?: string,
        items?: readonly T[],
        default_?: T,
        timeout?: number,
        ui_state?: unknown
    ): T | undefined;

    /**
     * Creates a TGUI alert window and returns the user's response.
     *
     * This proc should be used to create alerts that the caller will wait for a response from.
     * Arguments:
     * * user - The user to show the alert to.
     * * message - The content of the alert, shown in the body of the TGUI window.
     * * title - The of the alert modal, shown on the top of the TGUI window.
     * * buttons - The options that can be chosen by the user, each string is assigned a button on the UI.
     * * timeout - The timeout of the alert, after which the modal will close and qdel itself. Set to zero for no timeout.
     * * autofocus - The bool that controls if this alert should grab window focus.
     *
     * @blocking
     */
    tgui_alert<T extends string>(
        user: Byond.Mob | Byond.Client,
        message: string | undefined,
        title: string,
        buttons?: readonly [T, ...T[]],
        timeout?: number,
        autofocus?: Byond.Bool | boolean,
        ui_state?: unknown
    ): T | undefined;

    is_species(mob: Byond.Mob, species: Byond.Type<Byond.Datum.Species>): Byond.Bool;

    do_sparks(
        number: number,
        cardinal_only: Byond.Bool | boolean,
        source: Byond.Atom,
        holder?: Byond.Atom,
        spark_type?: Byond.Type<Byond.Datum.EffectSystem.Basic.SparkSpread>
    ): void;

    /**
     * playsound is a proc used to play a 3D sound in a specific range. This uses SOUND_RANGE + extra_range to determine that.
     *
     * Arguments:
     * * source - Origin of sound.
     * * soundin - Either a file, or a string that can be used to get an SFX.
     * * vol - The volume of the sound, excluding falloff and pressure affection.
     * * vary - bool that determines if the sound changes pitch every time it plays.
     * * extrarange - modifier for sound range. This gets added on top of SOUND_RANGE.
     * * falloff_exponent - Rate of falloff for the audio. Higher means quicker drop to low volume. Should generally be over 1 to indicate a quick dive to 0 rather than a slow dive.
     * * frequency - playback speed of audio.
     * * channel - The channel the sound is played at.
     * * pressure_affected - Whether or not difference in pressure affects the sound (E.g. if you can hear in space).
     * * ignore_walls - Whether or not the sound can pass through walls.
     * * falloff_distance - Distance at which falloff begins. Sound is at peak volume (in regards to falloff) aslong as it is in this range.
     * * volume_preference - Optional: Will be checked to modify the volume of the sound for each listener.
     * * min_volume - minimum volume the sound can reach at max_range.
     */
    playsound(
        source: Byond.Atom,
        soundin: Byond.Sound | string,
        vol: number,
        vary?: Byond.Bool | boolean,
        extrarange?: number,
        falloff_exponent?: number,
        frequency?: number,
        channel?: number,
        pressure_affected?: Byond.Bool | boolean,
        ignore_walls?: Byond.Bool | boolean,
        falloff_distance?: number,
        use_reverb?: Byond.Bool | boolean,
        volume_preference?: Byond.Datum.Preference.Numeric.Volume,
        min_volume?: number
    ): void;

    /**
     * One proc for easy spawning of pods in the code to drop off items before whizzling (please don't proc call this in game, it will destroy you)
     *
     * Arguments:
     * * specifications: special mods to the pod, see non var edit specifications for details on what you should fill this with
     * Non var edit specifications:
     * * target = where you want the pod to drop
     * * path = a special specific pod path if you want, this can save you a lot of var edits
     * * style = style of the pod, defaults to the normal pod
     * * spawn = spawned path or a list of the paths spawned, what you're sending basically
     * Returns the pod spawned, in case you want to spawn items yourself and modify them before putting them in.
     */
    podspawn<T extends Byond.Obj.Structure.Closet.Supplypod.Podspawn, S extends Byond.Datum.PodStyle>(specifications: {
        target: Byond.Turf;
        path?: Byond.Type<T>;
        style?: Byond.Type<S>;
        spawn?:
            | Byond.List<Byond.Type<Byond.Atom.Movable>, number>
            | Byond.List<number, Byond.Atom.Movable>
            | Byond.Atom.Movable;
    }): T;

    /**
     * Get a list of turfs in a line from `starting_atom` to `ending_atom`.
     *
     * Uses the ultra-fast [Bresenham Line-Drawing Algorithm](https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm).
     */
    get_line(starting_atom: Byond.Atom, ending_atom: Byond.Atom): Byond.List<number, Byond.Turf>;
}
