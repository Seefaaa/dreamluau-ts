declare interface TraitSignals {
    hooked: true; // used by smoker_hook ability
}

declare namespace Byond {
    interface Mob {
        get_organ_slot(this: Byond.Mob, slot: "zombie_infection"): Byond.Obj.Item.Organ.ZombieInfection | undefined;
    }
}

// #region Global variables

declare var runner: string;
declare var isLocal: boolean;
declare var localClass: keyof typeof import("./classes").zombieClasses;

declare var isSpawning: boolean;
declare var allowTankSpawn: boolean;
declare var allowZombieControllable: boolean;
declare var destructibleSpawners: boolean;

declare var allMutations: Record<string, import("./mutation").MutationData>;

// #endregion
