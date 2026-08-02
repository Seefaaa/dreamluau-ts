/** biome-ignore-all lint/suspicious/noShadowRestrictedNames: shutup */
/** biome-ignore-all lint/complexity/noBannedTypes: x */

type ParentInstance<P> = P extends { new: (...args: any[]) => infer T } ? T : {};

export function defineClass<
    // self
    A extends any[],
    R extends object,
    M extends Record<string, (...args: any[]) => any>,
    // parent
    P extends { new: (...args: any[]) => unknown },
>(
    constructor: (...args: A) => R,
    methods: M & ThisType<R & M & ParentInstance<P>>,
    parent?: P
): {
    new: (this: void, ...args: A) => R & typeof methods & ParentInstance<P>;
} {
    const table: any = {};

    if (!parent) {
        table.__index = table;
    } else {
        table.__index = (_: any, key: string) => {
            // @ts-expect-error
            return table[key] ?? parent[key];
        };
    }

    for (const key in methods) {
        table[key] = methods[key];
    }

    table.new = (...args: A) => {
        const instance = constructor(...args);
        if (parent) {
            const inherit = parent.new(...args) as any;
            for (const key in inherit) // @ts-expect-error
                if (!(key in instance)) instance[key] = inherit[key];
        }
        return setmetatable(instance, table);
    };

    return table;
}

// const Being = defineClass(() => ({}), {
//     onGain() {},
//     onLose() {},
// });

// const Zombie = defineClass(
//     () => ({}),
//     {
//         onGain() {
//             // print(`Zombie ${this.name} gained!`);
//         },
//     },
//     Being
// );
