import { locate } from "./globals";

/**
 * Returns a list of turfs within a specified block radius from a given location.
 * @param location The central location (Byond.Atom) from which to calculate the block of turfs.
 * @param radius The radius (in turfs) around the location to include in the block.
 * @returns A Byond.List containing the turfs within the specified block radius.
 */
export function rangeTurfs(location: Byond.Atom, radius: number): Byond.List<number, Byond.Turf> {
    const x = location.x;
    const y = location.y;
    const z = location.z;
    return dm.global_procs._block(locate(x - radius, y - radius, z), locate(x + radius, y + radius, z));
}
