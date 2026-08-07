import * as SS13 from "SS13";

export function invokeAsync(func: (...args: any[]) => void) {
    SS13.set_timeout(0, func);
}
