declare type OneBitOf<Flags extends number[]> = Flags extends [
    infer First extends number,
    ...infer Rest extends number[],
]
    ? First | OneBitOf<Rest>
    : 0;

declare type Bitflag<Flags extends number[]> = OneBitOf<Flags> | number;

declare type MethodsOf<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

declare type FieldsOf<T> = {
    [K in keyof T]: K extends string ? (T[K] extends (...args: any[]) => any ? never : K) : never;
}[keyof T];

declare type UniqueFieldsOf<T, U> = Exclude<FieldsOf<T>, FieldsOf<U>>;
