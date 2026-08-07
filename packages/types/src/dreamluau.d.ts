/** @noSelfInFile */

/**
 * Yields the active thread, without worrying about passing data into or out of the state.
 *
 * Threads yielded this way are placed at the end of a queue. Call the awaken hook function from DM to execute the thread at the front of the queue.
 *
 * @blocking
 */
declare function sleep(): void;

/**
 * Luau does not inherently include the loadstring function common to a number of other versions of lua. This is an effective reimplementation of loadstring.
 * @param code The string of code to be executed.
 */
declare function loadstring(code: string): (...args: unknown[]) => unknown;

/**
 * The handle to the underlying luau state in the dreamluau binary.
 */
declare const _state_id: number;

/**
 * The _exec module includes volatile fields related to the current execution context.
 */
declare namespace _exec {
    /**
     * When yielding a thread with coroutine.yield, it will be inserted into an internal table at the first open integer index. This field corresponds to that first open integer index.
     */
    const next_yield_index: number;

    /**
     * If set, the execution limit, rounded to the nearest millisecond.
     */
    const limit: number;

    /**
     * The length of successive time luau code has been executed, including recursive calls to DM and back into luau, rounded to the nearest millisecond.
     */
    const time: number;
}

// biome-ignore lint/suspicious/noEmptyInterface: implemented per codebase
interface GlobalVars {
    // [name: string]: unknown;
}

// biome-ignore lint/suspicious/noEmptyInterface: implemented per codebase
interface GlobalProcs {
    // [name: string]: (...args: any[]) => unknown;
}

/**
 * The dm module includes fields and functions for basic interaction with DM.
 */
declare const dm: {
    /**
     * A static reference to the DM world.
     */
    readonly world: Byond.World;

    /**
     * A static reference that functions like the DM keyword `global`. This can be indexed to read/write global vars.
     */
    readonly global_vars: GlobalVars;

    readonly global_procs: GlobalProcs;

    /**
     * Reads the `name` var on `object`. This function can be used to get vars that are shadowed by procs declared with the same name.
     * @param object Reference to the object to read the var from.
     * @param name The name of the var to read.
     */
    get_var(object: Byond.Datum, name: string): unknown;

    /**
     * Creates an instance of the object specified by `path`, with `...` as its arguments. If the "new" wrapper is set, that proc will be called instead, with the arguments `(path, {...})`.
     */
    new: (path: string, ...args: any[]) => Byond.Datum;

    /**
     * Returns true if the value passed in corresponds to a valid reference-counted DM object.
     * @param ref The variable to check for validity.
     */
    is_valid_ref(ref: any): boolean;

    /**
     * Corresponds to the DM var usr.
     */
    readonly usr: Byond.Mob | undefined;
};

/**
 * The list module contains wrappers for the builtin list procs, along with several other utility functions for working with lists.
 */
declare namespace list {
    /**
     * Logically equivalent to the DM statement list.Add(...).
     * @param list The list to add the values to.
     * @param args The values to add to the list.
     */
    function add<T>(list: Byond.List<number, T>, ...args: any[]): void;

    /**
     * Logically equivalent to the DM statement list.Copy(start, end).
     * @param list The list to copy values from.
     * @param start The starting index to copy from.
     * @param end The ending index to copy to.
     */
    function copy<T>(list: Byond.List<number, T>, start?: number, end?: number): Byond.List<number, T>;

    /**
     * Logically equivalent to the DM statement list.Cut(start, end).
     * @param list The list to cut values from.
     * @param start The starting index to cut from.
     * @param end The ending index to cut to.
     */
    function cut<T>(list: Byond.List<number, T>, start?: number, end?: number): Byond.List<number, T>;

    /**
     * Logically equivalent to the DM statement list.Find(item, start, end).
     * @param list The list to search.
     * @param item The item to find.
     * @param start The starting index to search from.
     * @param end The ending index to search to.
     */
    function find<T>(list: Byond.List<number, T>, item: T, start?: number, end?: number): number;

    /**
     * Logically equivalent to the DM statement list.Insert(item, ...).
     * @param list The list to insert into.
     * @param index The index to insert at.
     * @param args The values to insert.
     */
    function insert<T>(list: Byond.List<number, T>, index: number, ...args: any[]): number;

    /**
     * Logically equivalent to the statement list.Join(glue, start, end).
     * @param list The list to join.
     * @param glue The string to glue elements with.
     * @param start The starting index.
     * @param end The ending index.
     */
    function join<T>(list: Byond.List<number, T>, glue: string, start?: number, end?: number): string;

    /**
     * Logically equivalent to the DM statement list.Remove(...).
     * @param list The list to remove from.
     * @param args The values to remove.
     */
    function remove<T>(list: Byond.List<number, T>, ...args: T[]): number;

    /**
     * Logically equivalent to the DM statement list.RemoveAll(...).
     * @param list The list to remove from.
     * @param args The values to remove.
     */
    function remove_all<T>(list: Byond.List<number, T>, ...args: any[]): number;

    /**
     * Logically equivalent to the DM statement list.Splice(start, end, ...).
     * @param list The list to splice.
     * @param start The starting index.
     * @param end The ending index.
     * @param args The values to insert.
     */
    function splice<T>(list: Byond.List<number, T>, start?: number, end?: number, ...args: any[]): void;

    /**
     * Logically equivalent to the DM statement list.Swap(index_1, index_2).
     * @param list The list to swap elements in.
     * @param index_1 The first index.
     * @param index_2 The second index.
     */
    function swap<T>(list: Byond.List<number, T>, index_1: number, index_2: number): void;

    /**
     * Creates a table that is a copy of `list`. If `deep` is true, `to_table` will be called on any lists inside that list.
     * @param list The list to convert.
     * @param deep Whether to deeply convert nested lists.
     */
    function to_table<T extends AnyNotNil, V>(
        list: Byond.List<T extends number ? never : T, V>,
        deep?: boolean
    ): LuaTable<T, V>;
    function to_table<T>(list: Byond.List<number, T>, deep?: boolean): T[];

    /**
     * Creates a list that is a copy of `table`. This is not strictly necessary, as tables are automatically converted to lists when passed back into DM, using the same internal logic as `from_table`.
     * @param table The table to convert.
     */
    function from_table<K extends any[]>(table: K): Byond.List<number, K[number]>;

    /**
     * Returns a copy of `list`, containing only elements that are objects descended from `path`.
     * @param list The list to filter.
     * @param path The path to filter by.
     */
    function filter<T, P extends keyof TypePathRegistry, F extends T & TypePathRegistry[P]>(
        list: Byond.List<number, T>,
        path: P
    ): Byond.List<number, F>;
}

/**
 * The pointer module contains utility functions for interacting with pointers. Keep in mind that passing DM pointers into luau and manipulating them in this way can bypass wrapper procs.
 */
declare namespace pointer {
    /**
     * Gets the underlying data the pointer references.
     * @param pointer The pointer to read.
     */
    function read(pointer: LuaUserdata): any;

    /**
     * Writes `value` to the underlying data the pointer references.
     * @param pointer The pointer to write to.
     * @param value The value to write.
     */
    function write(pointer: LuaUserdata, value: any): void;

    /**
     * If `possible_pointer` is a pointer, reads it. Otherwise, it is returned as-is.
     * @param possible_pointer The value to potentially unwrap.
     */
    function unwrap(possible_pointer: any): any;
}

declare namespace Byond {
    type Bool = 1 | 0;
    type True = Extract<Byond.Bool, 1>;
    type False = Extract<Byond.Bool, 0>;

    class Type<T = unknown> {
        readonly __type?: T;
    }

    type List<K extends AnyNotNil, V> = LuaIterable<LuaMultiReturn<[K, V]>> &
        Iterable<[K, V]> & {
            get: LuaTableGetMethod<K, V | undefined>;
            set: LuaTableSetMethod<K, V>;
            has: LuaTableHasMethod<K>;
            delete: LuaTableDeleteMethod<K>;
            length: LuaLengthMethod<number>;
        };

    class Sound {
        readonly __sealed: true;
    }

    class Icon {
        readonly __sealed: true;
    }

    class Image extends Byond.Datum {
        icon: Byond.Icon | null;
        icon_state: string | null;
        appearance_flags: number;
        alpha: number;

        add_overlay(this: Byond.Image, overlay: Byond.Datum): void;
    }

    class MutableAppearance extends Byond.Image {}

    class Datum {
        private readonly __this?: this;

        readonly type: Byond.Type<this>;
    }

    class Client extends Datum {
        /**
         * This is a read-only value that contains the player’s key. Once the player is attached to a mob M, M.key == M.client.key.
         */
        key: string;

        /**
         * This is a read-only value that is the canonical form of the player’s key (ie the value returned by ckey()). Among other things, this could be used as a unique directory name in a server-side save file for storing player information. See the ckey() proc for an example.
         */
        ckey: string;

        mob: Byond.Mob;
    }

    class Atom extends Datum {
        x: number;
        y: number;
        z: number;

        /**
         * Controls the opacity of the icon displayed on players’ screens. A value of 128 means the atom is half-transparent, so it will have a ghostly appearance. This can be used to fade an atom in and out, especially when combined with animation. Alpha is also applied to maptext.
         *
         * Overlays and images will also be affected by alpha, unless they use the RESET_ALPHA value in appearance_flags.
         */
        alpha: number;

        /** The location of the object or null if there is none. */
        loc: Byond.Turf | undefined;

        /** The name of the object type with underscores converted to spaces. */
        name: string;

        /**
         * This is the description of the object.
         */
        desc: string | undefined;

        /**
         * This determines the object’s level of invisibility. The corresponding mob variable see_invisible controls the maximum level of invisibility that the mob may see.
         *
         * A value of 101 is absolutely invisible, no matter what, and it is filtered from all lists of possible values for verb arguments. This is intended for objects that exist purely for some internal purpose, such as “verb containers”.
         */
        invisibility: number;

        /** This numerical value determines the layer in which the object is drawn on the map. By default, the order is area, turf, obj, mob, followed by missiles and images (in FLY_LAYER, which is 5). */
        layer: number;

        /**
         * The value of plane overrides layer, and is mainly used for non-topdown map formats like isometric. Positive values are drawn on top, and negative values are drawn below. This mostly deprecates EFFECTS_LAYER and BACKGROUND_LAYER, but they can still be useful when using PLANE_MASTER for effects (see appearance_flags).
         */
        plane: number;

        /**
         * This displaces the object's icon horizontally by the specified number of pixels. Positive values move to the right; negative values move to the left.
         */
        pixel_x: number;

        /**
         * This displaces the object's icon vertically by the specified number of pixels. Positive values move up; negative values move down.
         */
        pixel_y: number;

        /**
         * This displaces the object’s icon vertically by the specified number of pixels. This is meant to be used in situations where world.map_format is used to display something other than a top-down form, for instance in an isometric or side-view display. In a top-down mode pixel_z behaves the same as pixel_y, except that it does not rotate with changes to client.dir.
         *
         * This effect is purely visual and does not influence such things as movement bumping or view() range calculations.
         */
        pixel_z: number;

        /**
         * This may be used to control how mouse operations on an object are interpreted. A click or mouse movement over an object’s icon normally applies to that object only if it is the topmost object that is not transparent at the position of the mouse. Setting mouse_opacity to 0 would cause the object to be ignored completely, and setting it to 2 causes it to always be chosen over any lower-level objects, regardless of the transparency of its icon.
         *
         * Note that overlays and underlays are not distinct objects, so their mouse_opacity is completely ignored in favor of the object they’re attached to. The same applies to image objects, which act like special overlays as well. Visual contents, on the other hand, are separate objects that can act like overlays in some ways, but because they’re separate their mouse_opacity is taken into account.
         *
         * When this is applied to a PLANE_MASTER object (see appearance_flags), a value of 0 means everything on the plane is mouse-transparent. 1 means everything on the plane is mouse-visible (using the objects’ normal mouse_opacity), but the plane master itself is not. 2 means everything on the plane is mouse-visible, and so is the plane master.
         *
         * Possible values:
         *
         * - 0 // transparent to mouse
         * - 1 // mouse-opaque where icon is also opaque
         * - 2 // completely mouse-opaque*
         */
        mouse_opacity: 0 | 1 | 2;

        /**
         * Controls the color of the icon displayed on players’ screens. This color is multiplied by the icon, so that a white icon will become this color. The color multiplier is also applied to maptext.
         *
         * If you include an alpha component in the color, the atom’s alpha var will be set at the same time.
         *
         * Overlays and images will also be multiplied by this color, unless they use the RESET_COLOR value in appearance_flags.
         *
         * The color value can be set to a color matrix, which is a list of values. This allows for more complex transformations such as adding or subtracting color, inverting the color, turning to grayscale, shifting hue, etc. Using an RGB-only color matrix will include the existing alpha value in the matrix.
         *
         * When reading the color var, if it is a matrix it will be read out as a list with 20 items (full RGBA format). That list is a copy, so if you save it and make changes to that list later it will not impact the actual color of the atom. This also means you can’t use color[9] = 0.5; you would have to grab the value of color first, make sure it’s a list, change it, and then assign the changed list back to the color var.
         */
        color: string | Byond.List<number, number> | undefined;

        /**
         * This is the icon file that will be used to represent the object on graphical clients.
         */
        icon: Byond.Icon | undefined;

        /**
         * Icons may appear differently depending on the icon state. For example, turf door icons could have “open” and “closed” states. If a state is specified that does not exist in the icon file, the default null state will be displayed if it exists.
         */
        icon_state: string | undefined;

        /**
         * Except in the case of areas, this list is always restricted to objs and mobs (ie movable objects). Only direct contents are listed. Items inside of a bag object, for example, would not show up in the mob’s contents list.
         *
         * The contents of areas are a little different. The turfs contained in the area are in the list along with any objs or mobs directly contained by those turfs.
         *
         * If a movable atom uses the bound vars to change its physical size, or step_x or step_y to change its position, it may cover more than one turf. In that case, those turfs’ contents won’t just contain anything directly in them, but also any atoms overhanging them. I.e., if a turf is in a mob’s locs list, then the mob is in that turf’s contents list. (See locs for more information.)
         */
        contents: Byond.List<number, Byond.Atom.Movable>;

        /**
         * This turns the object's density on or off (1 or 0). Two dense objects may not occupy the same space in the standard movement system.
         *
         * Default value: 0 (1 for mobs)
         */
        get density(): Byond.Bool;
        set density(value: Byond.Bool | boolean);
    }

    namespace Atom {
        class Movable extends Byond.Atom {
            Move(
                this: Byond.Atom.Movable,
                new_loc: Byond.Atom,
                direct?: Byond.Direction,
                step_x?: number,
                step_y?: number
            ): Byond.Bool | undefined;
        }
    }

    class Obj extends Byond.Atom.Movable {}

    class Mob extends Byond.Atom.Movable {
        /** This is the maximum level of invisibility that the mob can see. */
        see_invisible: number;

        /**
         * This is a reference to a set of properties specific to the player. Therefore non-player mobs (NPCs) do not have a client (client = null).
         *
         * Setting a mob’s client connects that player’s client to the mob.
         */
        client: Byond.Client | undefined;

        /**
         * For player mobs (PCs) this is the value of the player’s key. For non-player mobs (NPCs), this is the value of the “desired” key. This means that if a player with that key logs into the world, he will be connected to that mob (as opposed to a new one of type world.mob).
         *
         * Setting the mob’s key will cause a client with the same key to connect to the mob. Any other mob with the same key will lose it.
         *
         * Key values are always compared in canonical form (ie the form returned by ckey()) so setting a mob’s key to “Dan”, “dan” are equivalent as far as controlling player linkage.
         */
        key: string | undefined;

        /**
         * This is the value of mob.key converted to canonical form (ie the form returned by the ckey() proc). Among other things, this could be used as a unique directory name in a server-side save file for storing player information. See the ckey() proc for an example.
         */
        ckey: string | undefined;
    }

    class Turf extends Byond.Atom {}
    class Area extends Byond.Datum {}

    class World extends Byond.Datum {
        time: number;
        tick_lag: number;

        /**
         * This is the tile size that will be used as a default for icons in the world. It can be set to a single number that represents both the width and height, or you can use a format like "[width]x[height]" (such as "16x48") to specify width and height separately.
         *
         * Default value: 32
         *
         * The string form is why this is not just `number` — do not use it in arithmetic without narrowing.
         */
        icon_size: number | string;
    }

    namespace Direction {
        type North = 1;
        type South = 2;
        type East = 4;
        type West = 8;
        type Cardinal = North | South | East | West;

        type Northeast = 5;
        type Southeast = 6;
        type Northwest = 9;
        type Southwest = 10;
        type Ordinal = Northeast | Southeast | Northwest | Southwest;
    }

    type Direction = Direction.Cardinal | Direction.Ordinal;
}

// declare function pairs<K, V>(t: Byond.List<K extends number ? never : K, V>): LuaIterable<LuaMultiReturn<[K, V]>>;
