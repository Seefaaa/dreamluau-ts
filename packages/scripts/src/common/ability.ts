import * as SS13 from "SS13";

/**
 * A builder for creating abilities that can be granted to mobs.
 */
export type AbilityBuilder = {
    /**
     * The type of ability. "normal" abilities are activated by clicking on the ability button,
     * while "targeted" abilities require the player to click on a target after activating the ability.
     */
    abilityType: "normal" | "targeted";
    /**
     * The icon to display on the ability button. This should be a URL to an image file.
     */
    icon: Byond.Icon;
    /**
     * The icon state to use for the ability button. This should be a string that corresponds to an icon state in the icon file.
     */
    icon_state: string;
    /**
     * The name of the ability. This will be displayed on the ability button and in the ability tooltip.
     */
    name: string;
    /**
     * The description of the ability. This will be displayed in the ability tooltip.
     */
    desc?: string;
    /**
     * The cooldown time for the ability, in seconds.
     */
    cooldown?: number;
    /**
     * Callback function that is called when the ability is activated. This function should return a bitflag indicating what happened when the ability was activated.
     * @param action The action object that represents the ability. This can be used to access the ability's properties and methods.
     * @param target The target object for the ability.
     * @returns A bitflag indicating the result of the ability activation.
     * @shouldnotsleep This is called from the `mob_ability_base_started` signal handler in `grantAbility`.
     */
    onActivate: (
        this: void,
        action: Byond.Datum.Action.Cooldown,
        target: Byond.Atom
    ) => OneBitOf<[COMPONENT_BLOCK_ABILITY_START]> | undefined;
} & (
    | {
          abilityType: "normal";
      }
    | {
          abilityType: "targeted";
          /**
           * The mouse icon to display when the player activates the ability and is prompted to select a target.
           */
          pointerIcon: Byond.Icon;
      }
);

/**
 * Creates and grants an ability to a mob. The ability is defined by the provided AbilityBuilder.
 * @param mob The mob to which the ability will be granted.
 * @param ability The AbilityBuilder that defines the ability to be granted. This includes the ability's type, icon, name, description, cooldown time, and onActivate callback.
 * @returns The created `Byond.Datum.Action.Cooldown` object
 */
export function grantAbility(mob: Byond.Mob, ability: AbilityBuilder): Byond.Datum.Action.Cooldown {
    const action = SS13.new("/datum/action/cooldown");

    if (ability.abilityType === "targeted") {
        action.click_to_activate = 1;
        action.unset_after_click = 1;
        action.ranged_mousepointer = ability.pointerIcon;
    }

    action.name = ability.name;

    if (ability.desc) {
        action.desc = ability.desc;
    }

    action.button_icon = ability.icon;
    action.button_icon_state = ability.icon_state;
    action.background_icon_state = "bg_heretic";
    action.overlay_icon_state = "bg_hereic_border";
    action.active_overlay_icon_state = "bg_nature_border";

    action.cooldown_time = (ability.cooldown ?? 0) * 10;

    const handler = (source: Byond.Mob, actionTarget: Byond.Datum.Action.Cooldown, target: Byond.Atom) => {
        if (!SS13.is_valid(action) || !SS13.is_valid(actionTarget)) return 0;

        if (dm.global_procs.REF(actionTarget) === dm.global_procs.REF(action)) {
            const clickCooldown = action.click_cd_override;

            const result = ability.onActivate(action, target);

            // onActivate may delete the action
            if (SS13.is_valid(action) && action.unset_after_click === 1) {
                action.unset_click_ability(source, false);
            }

            source.next_click = dm.world.time + clickCooldown;

            return result ?? 0;
        }

        return 0;
    };

    SS13.register_signal(mob, "mob_ability_base_started", handler);

    SS13.register_signal(action, "parent_qdeleting", () => {
        SS13.unregister_signal(mob, "mob_ability_base_started", handler);
    });

    action.Grant(mob);

    return action;
}

declare var counter: number;
counter ??= 0;
