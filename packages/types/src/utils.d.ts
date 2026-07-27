declare type Bitflag<Flags extends number[]> = Flags extends [
    infer First extends number,
    ...infer Rest extends number[],
]
    ? First | Bitflag<Rest>
    : 0;
