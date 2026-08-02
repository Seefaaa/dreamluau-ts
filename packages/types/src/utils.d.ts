/**
 * Extracts an array of numbers into a union of its elements and adds 0 to the union.
 *
 * @example
 * ```ts
 * type MyFlags = [1, 2, 4];
 * type Result = OneBitOf<MyFlags>; // 0 | 1 | 2 | 4
 * ```
 */
declare type OneBitOf<Flags extends number[]> = Flags extends [
    infer First extends number,
    ...infer Rest extends number[],
]
    ? First | OneBitOf<Rest>
    : 0;

/**
 * Extracts the return type of a function F when called with arguments of type A.
 */
declare type ReturnsWhen<F, A extends any[]> = F extends (...args: A) => infer R ? R : never;

/**
 * Actually, doesn't do anything because you can't do bitwise operations on types.
 * But it is a good reminder that the type is a bitflag and not just a number.
 */
declare type Bitflag<Flags extends number[]> = OneBitOf<Flags> | number;

/**
 * Extracts the keys of T that are methods (functions).
 *
 * @example
 * ```ts
 * type MyObject = {
 *     foo: () => void;
 *     bar: string;
 *     baz: (x: number) => number;
 * };
 *
 * type MethodKeys = MethodsOf<MyObject>; // "foo" | "baz"
 * ```
 */
declare type MethodsOf<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Extracts the keys of T that are fields (non-functions).
 *
 * @example
 * ```ts
 * type MyObject = {
 *     foo: () => void;
 *     bar: string;
 *     baz: (x: number) => number;
 * };
 *
 * type FieldKeys = FieldsOf<MyObject>; // "bar"
 * ```
 */
declare type FieldsOf<T> = {
    [K in keyof T]: K extends string ? (T[K] extends (...args: any[]) => any ? never : K) : never;
}[keyof T];

/**
 * Extracts the keys of T that are fields (non-functions) and not present in U.
 *
 * @example
 * ```ts
 * class Base {
 *     baseField: string;
 *     baseMethod(): void {}
 * }
 *
 * class Derived extends Base {
 *     derivedField: number;
 *     derivedMethod(): void {}
 * }
 *
 * type UniqueFields = UniqueFieldsOf<Derived, Base>; // "derivedField"
 * ```
 */
declare type UniqueFieldsOf<T, U> = Exclude<FieldsOf<T>, FieldsOf<U>>;
