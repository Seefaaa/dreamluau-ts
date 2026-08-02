declare interface TraitSignals {
    hooked: true; // used by smoker_hook ability
}

// #region Global variables

declare var admin: string;
declare var isLocal: boolean;
declare var localClass: import("./mutation").ZombieClassName;

declare var isSpawning: boolean;
declare var allowTankSpawn: boolean;
declare var allowZombieControllable: boolean;
declare var destructibleSpawners: boolean;

declare var allMutations: Record<string, import("./mutation").MutationData>;

// #endregion
