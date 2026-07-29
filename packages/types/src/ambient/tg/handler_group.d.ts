/** @noSelfInFile */

/// <reference path="../../index.d.ts" />

/**
 * HandlerGroup is a class object that allows you to register signals on datums and clear them all at once.
 *
 * It is useful for managing signal handlers in a clean and organized way.
 *
 * See [handler_group.lua](https://github.com/tgstation/tgstation/blob/a839cd44c27edb3c8cf9f0048f4afc03988787ae/lua/handler_group.lua) for implementation.
 *
 * @noResolution
 */
declare module "handler_group" {
    const HandlerGroup: HandlerGroupConstructor;
    export = HandlerGroup;
}

interface HandlerGroup {
    registered: {
        datum: Byond.Datum;
        signal: string;
        func: (...args: any[]) => any;
    }[];

    /**
     * Registers a signal on a datum for this handler group instance.
     * @param datum The datum to register the signal on.
     * @param signal The signal to register on the datum.
     * @param func The function to call when the signal is emitted.
     */
    register_signal<D extends Byond.Datum, S extends keyof SignalRegistry<D>>(
        this: HandlerGroup,
        datum: D,
        signal: S,
        func: SignalRegistry<D>[S]
    ): void;

    /**
     * Clears all the signals that have been registered on this HandlerGroup
     */
    clear(this: HandlerGroup): void;

    /**
     * Clears all the signals that have been registered on this HandlerGroup when a specific signal is sent on a datum.
     * @param datum The datum to clear the signal on.
     * @param signal The signal to register on the datum.
     * @param func The function to call when the signal is emitted.
     */
    clear_on<D extends Byond.Datum, S extends keyof SignalRegistry<D>>(
        this: HandlerGroup,
        datum: D,
        signal: S,
        func: SignalRegistry<D>[S]
    ): void;
}

interface HandlerGroupConstructor {
    /**
     * Creates a new HandlerGroup instance. A HandlerGroup is a collection of signal handlers that can be cleared all at once.
     * @returns A new HandlerGroup instance.
     */
    new: (this: void) => HandlerGroup;

    /**
     * Registers a signal on a datum and clears it after it is called once.
     * @param datum The datum to register the signal on.
     * @param signal The signal to register on the datum.
     * @param func The function to call when the signal is emitted. It will be cleared after it is called once.
     */
    register_once<D extends Byond.Datum, S extends keyof SignalRegistry<D>>(
        this: void,
        datum: D,
        signal: S,
        func: SignalRegistry<D>[S]
    ): void;
}
