/** @noSelfInFile */

import * as SS13 from "SS13";

export function spawnFoam<T extends Byond.Datum.Reagent>(
    position: Byond.Atom,
    fluidGroup: Byond.Datum.FluidGroup,
    color: string,
    reagnent: Byond.Type<T>,
    volume: number
) {
    const foam = SS13.new("/obj/effect/particle_effect/fluid/foam/short_life", position, fluidGroup);
    foam.color = color;
    foam.reagents.add_reagent(reagnent, volume);
}

export function foamSpawner<T extends PathsOf<Byond.Datum.Reagent>>(
    fluidGroup: Byond.Datum.FluidGroup,
    color: string,
    reagnent: T,
    volume: number
) {
    const reagentType = SS13.type(reagnent);
    return (position: Byond.Atom) => spawnFoam(position, fluidGroup, color, reagentType, volume);
}
