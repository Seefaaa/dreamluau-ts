import * as SS13 from "SS13";

/**
 * A builder for creating abilities that can be granted to mobs.
 * @typeParam Context - The type of the context object that will be passed to the onActivate callback.
 */
export type AbilityBuilder<Context = undefined> = {
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
     * @param context The context object that was passed to the grantAbility function. This can be used to store any data that needs to be accessed when the ability is activated.
     * @param action The action object that represents the ability. This can be used to access the ability's properties and methods.
     * @param target The target object for the ability.
     * @returns A bitflag indicating the result of the ability activation.
     * @shouldnotsleep This is called from the `mob_ability_base_started` signal handler in `grantAbility`.
     */
    onActivate: (
        this: void,
        context: Context,
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
 * Creates and grants an ability to a mob. The ability is defined by the provided AbilityBuilder, and the context object is passed to the onActivate callback when the ability is activated.
 * @param mob The mob to which the ability will be granted.
 * @param context The context object that will be passed to the onActivate callback when the ability is activated. This can be used to store any data that needs to be accessed when the ability is activated.
 * @param ability The AbilityBuilder that defines the ability to be granted. This includes the ability's type, icon, name, description, cooldown time, and onActivate callback.
 * @returns The created `Byond.Datum.Action.Cooldown` object
 */
export function grantAbility<Context>(
    mob: Byond.Mob,
    context: Context,
    ability: AbilityBuilder<Context>
): Byond.Datum.Action.Cooldown {
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

    SS13.register_signal(mob, "mob_ability_base_started", (source, actionTarget, target) => {
        if (dm.global_procs.REF(actionTarget) === dm.global_procs.REF(action)) {
            const result = ability.onActivate(context, action, target);

            if (action.unset_after_click === 1) {
                action.unset_click_ability(source, false);
            }

            source.next_click = dm.world.time + action.click_cd_override;

            return result ?? 0;
        }
        return 0;
    });

    action.Grant(mob);

    return action;
}
