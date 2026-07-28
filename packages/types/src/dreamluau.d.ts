/** @noSelfInFile */

/**
 * Yields the active thread, without worrying about passing data into or out of the state.
 *
 * Threads yielded this way are placed at the end of a queue. Call the awaken hook function from DM to execute the thread at the front of the queue.
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
    readonly usr: Byond.Datum | undefined;
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
    function add(list: Byond.List, ...args: any[]): void;

    /**
     * Logically equivalent to the DM statement list.Copy(start, end).
     * @param list The list to copy values from.
     * @param start The starting index to copy from.
     * @param end The ending index to copy to.
     */
    function copy(list: Byond.List, start?: number, end?: number): Byond.List;

    /**
     * Logically equivalent to the DM statement list.Cut(start, end).
     * @param list The list to cut values from.
     * @param start The starting index to cut from.
     * @param end The ending index to cut to.
     */
    function cut(list: Byond.List, start?: number, end?: number): Byond.List;

    /**
     * Logically equivalent to the DM statement list.Find(item, start, end).
     * @param list The list to search.
     * @param item The item to find.
     * @param start The starting index to search from.
     * @param end The ending index to search to.
     */
    function find(list: Byond.List, item: any, start?: number, end?: number): number;

    /**
     * Logically equivalent to the DM statement list.Insert(item, ...).
     * @param list The list to insert into.
     * @param index The index to insert at.
     * @param args The values to insert.
     */
    function insert(list: Byond.List, index: number, ...args: any[]): number;

    /**
     * Logically equivalent to the statement list.Join(glue, start, end).
     * @param list The list to join.
     * @param glue The string to glue elements with.
     * @param start The starting index.
     * @param end The ending index.
     */
    function join(list: Byond.List, glue: string, start?: number, end?: number): string;

    /**
     * Logically equivalent to the DM statement list.Remove(...).
     * @param list The list to remove from.
     * @param args The values to remove.
     */
    function remove(list: Byond.List, ...args: any[]): number;

    /**
     * Logically equivalent to the DM statement list.RemoveAll(...).
     * @param list The list to remove from.
     * @param args The values to remove.
     */
    function remove_all(list: Byond.List, ...args: any[]): number;

    /**
     * Logically equivalent to the DM statement list.Splice(start, end, ...).
     * @param list The list to splice.
     * @param start The starting index.
     * @param end The ending index.
     * @param args The values to insert.
     */
    function splice(list: Byond.List, start?: number, end?: number, ...args: any[]): void;

    /**
     * Logically equivalent to the DM statement list.Swap(index_1, index_2).
     * @param list The list to swap elements in.
     * @param index_1 The first index.
     * @param index_2 The second index.
     */
    function swap(list: Byond.List, index_1: number, index_2: number): void;

    /**
     * Creates a table that is a copy of `list`. If `deep` is true, `to_table` will be called on any lists inside that list.
     * @param list The list to convert.
     * @param deep Whether to deeply convert nested lists.
     */
    function to_table(list: Byond.List, deep?: boolean): LuaTable;

    /**
     * Creates a list that is a copy of `table`. This is not strictly necessary, as tables are automatically converted to lists when passed back into DM, using the same internal logic as `from_table`.
     * @param table The table to convert.
     */
    function from_table<K extends any[]>(table: K): Byond.List<number, K[number]>;
    // function from_table<K extends keyof object, V>(table: Record<K, V>): Byond.List<K, V>;
    function from_table(table: object): Byond.List;

    /**
     * Returns a copy of `list`, containing only elements that are objects descended from `path`.
     * @param list The list to filter.
     * @param path The path to filter by.
     */
    function filter(list: Byond.List, path: string): Byond.List;
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

    class Type<T = unknown> {
        readonly __sealed: true;
    }

    class List<K = number, V = unknown> {
        // readonly __sealed: true;
        [key: string]: V;
        [key: number]: V;
        [Symbol.iterator](): IterableIterator<V>;
    }

    // type List<K extends AnyNotNil = number, V = unknown> = LuaTable<K, V>;

    class Sound {
        readonly __sealed: true;
    }

    class Icon {
        readonly __sealed: true;
    }

    class Datum {
        readonly type: Type;
    }

    class Atom extends Datum {
        x: number;
        y: number;
        z: number;

        /** The location of the object or null if there is none. */
        loc: Byond.Turf | undefined;

        /** The name of the object type with underscores converted to spaces. */
        name: string;

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
    }

    namespace Atom {
        class Movable extends Byond.Atom {}
    }

    class Obj extends Byond.Atom {}

    class Mob extends Atom.Movable {
        /** This is the maximum level of invisibility that the mob can see. */
        see_invisible: number;
    }

    class Turf extends Atom {}
    class Area extends Datum {}

    class World extends Datum {
        time: number;
        tick_lag: number;
    }
}
