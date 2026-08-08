// #region Constants

export const cardinals = [1, 2, 4, 8] as const;

export const damageTypes = [
    "bleed_mod",
    "brain_mod",
    "burn_mod",
    "brute_mod",
    "cold_mod",
    "heat_mod",
    "hunger_mod",
    "oxy_mod",
    "pressure_mod",
    "stamina_mod",
    "siemens_coeff",
    "tox_mod",
] as const satisfies UniqueFieldsOf<Byond.Datum.Physiology, Byond.Datum>[];

export const maxPathfindingRange = 15;

// #endregion
