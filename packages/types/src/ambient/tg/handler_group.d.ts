/** @noSelfInFile */

/**
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
    register_signal(
        this: HandlerGroup,
        datum: Byond.Datum,
        signal: string,
        func: (...args: any[]) => any,
    ): void;

    /**
     * Clears all the signals that have been registered on this HandlerGroup
     */
    clear(): void;

    /**
     * Clears all the signals that have been registered on this HandlerGroup when a specific signal is sent on a datum.
     * @param datum The datum to clear the signal on.
     * @param signal The signal to register on the datum.
     * @param func The function to call when the signal is emitted.
     */
    clear_on(
        this: HandlerGroup,
        datum: Byond.Datum,
        signal: string,
        func: (...args: any[]) => any,
    ): void;

    /**
     * Registers a signal on a datum and clears it after it is called once.
     * @param datum The datum to register the signal on.
     * @param signal The signal to register on the datum.
     * @param func The function to call when the signal is emitted. It will be cleared after it is called once.
     */
    register_once(
        this: HandlerGroup,
        datum: Byond.Datum,
        signal: string,
        func: (...args: any[]) => any,
    ): void;
}

interface HandlerGroupConstructor {
    new: () => HandlerGroup;
}
