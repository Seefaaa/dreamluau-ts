/// <reference types="@types/bun" />

import { describe, expect, test } from "bun:test";
import ts from "typescript";
import { analyze } from "./index";

/**
 * Every case here is a miniature program compiled in memory, so nothing depends on `packages/scripts` and
 * editing the game scripts can never break the suite.
 *
 * The tags are what the analyser keys off, so the fixtures declare their own tagged primitives rather than
 * importing the real `SS13` module:
 *
 * - `sleeps()` stands in for `sleep()` / `SS13.await` — the `@blocking` leaf.
 * - `onSignal(cb)` stands in for `SS13.register_signal` — the `@shouldnotsleep` context.
 * - `defer(cb)` stands in for `SS13.set_timeout` — the `@async` escape hatch.
 */
const PRELUDE = `
/** @blocking */
declare function sleeps(): void;

/** @shouldnotsleep */
declare function onSignal(cb: () => void): void;

/** @async */
declare function defer(cb: () => void): void;

declare function harmless(): void;
`;

const OPTIONS: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
};

const MAIN = "/virtual/main.ts";

/**
 * Compiles `source` (with the prelude prepended) and returns what the plugin reports.
 *
 * Lib files are read from the real typescript install rather than stubbed — with `noLib` the checker has no
 * `Function` or `Object` and signature resolution stops behaving like it does in the real build.
 */
function diagnose(source: string, extraFiles: Record<string, string> = {}): ts.Diagnostic[] {
    const files: Record<string, string> = { [MAIN]: PRELUDE + source, ...extraFiles };
    const libPath = ts.getDefaultLibFilePath(OPTIONS);

    const host: ts.CompilerHost = {
        fileExists: (fileName) => fileName in files || ts.sys.fileExists(fileName),
        readFile: (fileName) => files[fileName] ?? ts.sys.readFile(fileName),
        getSourceFile(fileName, languageVersion) {
            const text = files[fileName] ?? ts.sys.readFile(fileName);
            return text === undefined ? undefined : ts.createSourceFile(fileName, text, languageVersion, true);
        },
        getDefaultLibFileName: () => libPath,
        writeFile: () => {},
        getCurrentDirectory: () => "/virtual",
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
    };

    return analyze(ts.createProgram(Object.keys(files), OPTIONS, host));
}

/** Diagnostic messages as plain strings, so cases can assert on wording without unwrapping chains. */
function messagesOf(diagnostics: ts.Diagnostic[]): string[] {
    return diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

describe("blocking-lint", () => {
    test("reports a blocking call made directly in a must-not-sleep callback", () => {
        const diagnostics = diagnose(`
            onSignal(() => {
                sleeps();
            });
        `);

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]?.code).toBe(90001);
        expect(diagnostics[0]?.category).toBe(ts.DiagnosticCategory.Error);
        expect(messagesOf(diagnostics)[0]).toContain("`sleeps` can sleep");
        // a one-hop chain would just repeat the name, so it is left out
        expect(messagesOf(diagnostics)[0]).not.toContain("→");
    });

    test("follows a chain of calls and reports the whole trail", () => {
        const diagnostics = diagnose(`
            function inner() { sleeps(); }
            function outer() { inner(); }

            onSignal(() => {
                outer();
            });
        `);

        expect(diagnostics).toHaveLength(1);
        // the call written at the site is what gets named; the trail explains why it blocks
        expect(messagesOf(diagnostics)[0]).toContain("`outer` can sleep");
        expect(messagesOf(diagnostics)[0]).toContain("outer → inner → sleeps");
    });

    test("does not report a blocking call inside a callback handed to an @async function", () => {
        expect(
            diagnose(`
                onSignal(() => {
                    defer(() => {
                        sleeps();
                    });
                });
            `)
        ).toBeEmpty();
    });

    test("does not report a call to an @async function that blocks internally", () => {
        // the DM equivalent is `set waitfor = FALSE`: the proc sleeps, but the caller resumes anyway
        expect(
            diagnose(`
                /** @async */
                function fireAndForget() { sleeps(); }

                onSignal(() => {
                    fireAndForget();
                });
            `)
        ).toBeEmpty();
    });

    test("ignores a nested function that is only declared, not called", () => {
        expect(
            diagnose(`
                onSignal(() => {
                    const later = () => { sleeps(); };
                    defer(later);
                });
            `)
        ).toBeEmpty();
    });

    test("still follows a nested function once it is actually called", () => {
        const diagnostics = diagnose(`
            onSignal(() => {
                const later = () => { sleeps(); };
                later();
            });
        `);

        expect(diagnostics).toHaveLength(1);
        expect(messagesOf(diagnostics)[0]).toContain("later → sleeps");
    });

    test("resolves a base-typed method call to an override further down the hierarchy", () => {
        // the call resolves to `Base.step`, which is empty — only the override actually blocks
        const diagnostics = diagnose(`
            class Base { step(): void {} }
            class Mid extends Base {}
            class Leaf extends Mid { override step(): void { sleeps(); } }

            declare const thing: Base;

            onSignal(() => {
                thing.step();
            });
        `);

        expect(diagnostics).toHaveLength(1);
        expect(messagesOf(diagnostics)[0]).toContain("step → sleeps");
    });

    test("terminates on a cycle in the call graph", () => {
        // without the cycle guard this recurses forever — the failure is a hang, not an assertion
        expect(
            diagnose(`
                function ping(): void { pong(); }
                function pong(): void { ping(); }

                onSignal(() => {
                    ping();
                });
            `)
        ).toBeEmpty();
    });

    test("treats a symbol as blocking when any single overload is tagged", () => {
        const diagnostics = diagnose(`
            /** @blocking */
            declare function ask(question: string): string;
            declare function ask(question: string, fallback: number): number;

            onSignal(() => {
                ask("a");
            });

            onSignal(() => {
                ask("b", 1);
            });
        `);

        expect(diagnostics).toHaveLength(2);
    });

    test("reports a function assigned to a @shouldnotsleep property", () => {
        const diagnostics = diagnose(`
            type Ability = {
                /** @shouldnotsleep */
                onActivate: () => void;
            };

            declare function grant(ability: Ability): void;

            grant({
                onActivate: () => {
                    sleeps();
                },
            });
        `);

        expect(diagnostics).toHaveLength(1);
        expect(messagesOf(diagnostics)[0]).toContain("assigned to `onActivate`");
    });

    test("reports a function declaration tagged @shouldnotsleep itself", () => {
        const diagnostics = diagnose(`
            /** @shouldnotsleep */
            function handler() {
                sleeps();
            }
        `);

        expect(diagnostics).toHaveLength(1);
        expect(messagesOf(diagnostics)[0]).toContain("`handler` is marked @shouldnotsleep");
    });

    test("stays quiet on code that never reaches a blocking call", () => {
        expect(
            diagnose(`
                function helper() { harmless(); }

                onSignal(() => {
                    harmless();
                    helper();
                });
            `)
        ).toBeEmpty();
    });

    test("points the diagnostic at the offending call", () => {
        const source = `
            onSignal(() => {
                sleeps();
            });
        `;
        const diagnostics = diagnose(source);
        const diagnostic = diagnostics[0];

        expect(diagnostic?.file?.fileName).toBe(MAIN);

        const start = diagnostic?.start ?? 0;
        expect((PRELUDE + source).slice(start, start + (diagnostic?.length ?? 0))).toBe("sleeps()");
    });
});
