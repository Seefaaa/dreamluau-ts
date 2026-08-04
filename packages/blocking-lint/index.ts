import ts from "typescript";
import type * as tstl from "typescript-to-lua";

/**
 * A tstl plugin that reports blocking (sleeping) calls made from contexts that must not sleep.
 *
 * BYOND procs are not all synchronous: a proc that calls `sleep()` does not block the engine, it yields
 * itself and is resumed later. Some contexts are resumed by nobody — a signal handler runs synchronously
 * inside `SEND_SIGNAL`, so yielding out of one is a runtime error. DM guards this with `SHOULD_NOT_SLEEP`
 * and offers `INVOKE_ASYNC` as the escape hatch; this plugin is the equivalent for the TypeScript side,
 * with `SS13.set_timeout` as the escape hatch.
 *
 * Three JSDoc tags drive it, all written on the declaration of the thing being *called*:
 *
 * - `@blocking` — calling this may sleep. These are the seeds of the analysis.
 * - `@async` — calling this never blocks the caller: it runs until it first sleeps and then hands itself back
 *   to the engine (DM's `set waitfor = FALSE`). Function-typed arguments passed to it are in the same position,
 *   so they are allowed to sleep and do not propagate blocking-ness outward.
 * - `@shouldnotsleep` — on a function, its function-typed arguments must not sleep; on a property or
 *   method signature, whatever function is assigned there must not sleep.
 *
 * Blocking-ness is inferred transitively: a function that reaches a `@blocking` declaration through any
 * chain of calls is itself treated as blocking.
 *
 * See `docs/blocking.md`.
 */

const BLOCKING = "blocking";
const SHOULD_NOT_SLEEP = "shouldnotsleep";
const ASYNC = "async";

/** Diagnostic code reported for every violation. Outside the ranges TypeScript and tstl use. */
const DIAGNOSTIC_CODE = 90001;

type FunctionWithBody = ts.SignatureDeclaration & { body: ts.Node };

/** One hop of a call chain from a must-not-sleep context down to the `@blocking` declaration it reaches. */
type Hop = { name: string; node: ts.Node };

function isFunctionWithBody(node: ts.Node): node is FunctionWithBody {
    return ts.isFunctionLike(node) && (node as ts.FunctionLikeDeclaration).body !== undefined;
}

function hasTag(node: ts.Node, tag: string): boolean {
    return ts.getJSDocTags(node).some((t) => t.tagName.text.toLowerCase() === tag);
}

/**
 * A symbol counts as tagged when *any* of its declarations carries the tag — overloads are declared
 * separately, and tagging one of them is enough to describe the proc behind them.
 */
function symbolHasTag(symbol: ts.Symbol | undefined, tag: string): boolean {
    return symbol?.declarations?.some((d) => hasTag(d, tag)) ?? false;
}

function callName(call: ts.CallExpression | ts.NewExpression): string {
    const target = call.expression;
    if (ts.isIdentifier(target)) return target.text;
    if (ts.isPropertyAccessExpression(target)) return target.name.getText();
    if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)) {
        return target.argumentExpression.text;
    }
    return (target.getText().split("\n")[0] ?? "").slice(0, 40);
}

function describeFunction(node: ts.Node): string {
    const named = node as ts.NamedDeclaration;
    if (named.name) return named.name.getText();
    return "callback";
}

class Analyzer {
    private readonly checker: ts.TypeChecker;

    /** `undefined` chain means "proven not blocking"; absence means "not computed yet". */
    private readonly cache = new Map<ts.Node, Hop[] | undefined>();

    /** Guards against infinite recursion on cyclic call graphs; a cycle is treated as non-blocking. */
    private readonly visiting = new Set<ts.Node>();

    /**
     * Base method symbol -> implementations that override it. Calls resolve to the *declared* signature,
     * so without this a `nextClass.onGain()` on a `ZombieClass`-typed value would only ever see the empty
     * base method and never `Boomer.onGain`.
     */
    private readonly overrides = new Map<ts.Symbol, FunctionWithBody[]>();

    readonly diagnostics: ts.Diagnostic[] = [];

    constructor(private readonly program: ts.Program) {
        this.checker = program.getTypeChecker();
        this.buildOverrideMap();
    }

    // #region Override map

    private buildOverrideMap() {
        for (const file of this.sourceFiles()) {
            const visit = (node: ts.Node): void => {
                if (ts.isClassLike(node) && node.name) this.recordOverridesOf(node);
                ts.forEachChild(node, visit);
            };
            ts.forEachChild(file, visit);
        }
    }

    private recordOverridesOf(node: ts.ClassLikeDeclaration) {
        const symbol = node.name && this.checker.getSymbolAtLocation(node.name);
        if (!symbol) return;

        const ancestors = this.baseTypesOf(this.checker.getDeclaredTypeOfSymbol(symbol));
        if (ancestors.length === 0) return;

        for (const member of node.members) {
            if (!isFunctionWithBody(member)) continue;
            if (member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)) continue;

            const name = (member as ts.NamedDeclaration).name;
            if (!name || !ts.isIdentifier(name)) continue;

            for (const ancestor of ancestors) {
                const inherited = this.checker.getPropertyOfType(ancestor, name.text);
                if (!inherited) continue;

                const existing = this.overrides.get(inherited);
                if (existing) existing.push(member);
                else this.overrides.set(inherited, [member]);
            }
        }
    }

    /** All transitive base types, so an override three levels down still reaches the root declaration. */
    private baseTypesOf(type: ts.Type): ts.Type[] {
        const found: ts.Type[] = [];
        const seen = new Set<ts.Type>();

        const walk = (current: ts.Type) => {
            if (!current.isClassOrInterface()) return;
            for (const base of this.checker.getBaseTypes(current)) {
                if (seen.has(base)) continue;
                seen.add(base);
                found.push(base);
                walk(base);
            }
        };

        walk(type);
        return found;
    }

    // #endregion

    // #region Blocking inference

    /** Every implementation a call to `symbol` could actually land in. */
    private *implementationsOf(symbol: ts.Symbol): Iterable<FunctionWithBody> {
        for (const declaration of symbol.declarations ?? []) {
            if (isFunctionWithBody(declaration)) yield declaration;
            else if (
                (ts.isVariableDeclaration(declaration) ||
                    ts.isPropertyDeclaration(declaration) ||
                    ts.isPropertyAssignment(declaration)) &&
                declaration.initializer &&
                isFunctionWithBody(declaration.initializer)
            ) {
                yield declaration.initializer;
            }
        }

        yield* this.overrides.get(symbol) ?? [];
    }

    private calleeSymbol(call: ts.CallExpression | ts.NewExpression): ts.Symbol | undefined {
        const declaration = this.checker.getResolvedSignature(call)?.declaration;
        // the declaration's own symbol carries *all* overloads, which is what `symbolHasTag` wants
        const fromSignature = declaration && (declaration as ts.Declaration & { symbol?: ts.Symbol }).symbol;
        if (fromSignature) return fromSignature;

        const symbol = this.checker.getSymbolAtLocation(call.expression);
        // `SS13` re-exports from `SS13_base` and `timer`, so the tag lives on the aliased declaration
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) return this.checker.getAliasedSymbol(symbol);
        return symbol;
    }

    /** The chain from `fn` down to a `@blocking` declaration, or `undefined` if it cannot sleep. */
    private blockingPath(fn: FunctionWithBody): Hop[] | undefined {
        if (hasTag(fn, BLOCKING)) return [];

        if (this.cache.has(fn)) return this.cache.get(fn);
        if (this.visiting.has(fn)) return undefined;
        this.visiting.add(fn);

        let result: Hop[] | undefined;

        const visit = (node: ts.Node): void => {
            if (result) return;
            // nested functions are deferred, not run here; they are analysed as roots of their own
            if (isFunctionWithBody(node)) return;

            if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
                result = this.blockingPathOfCall(node);
                if (result) return;
            }

            ts.forEachChild(node, visit);
        };

        ts.forEachChild(fn, visit);

        this.visiting.delete(fn);
        this.cache.set(fn, result);
        return result;
    }

    private blockingPathOfCall(call: ts.CallExpression | ts.NewExpression): Hop[] | undefined {
        const here: Hop = { name: callName(call), node: call };
        const symbol = this.calleeSymbol(call);

        // `@async` is a hard stop: the callee hands itself back to the engine the first time it sleeps, so the
        // caller resumes regardless of what happens inside it or in anything it was given
        if (symbolHasTag(symbol, ASYNC)) return undefined;

        if (symbol) {
            if (symbolHasTag(symbol, BLOCKING)) return [here];

            for (const implementation of this.implementationsOf(symbol)) {
                const rest = this.blockingPath(implementation);
                if (rest) return [here, ...rest];
            }
        }

        // an inline callback runs synchronously unless the callee defers it
        for (const argument of call.arguments ?? []) {
            if (!isFunctionWithBody(argument)) continue;
            const rest = this.blockingPath(argument);
            if (rest) return [{ name: `${here.name}(...)`, node: argument }, ...rest];
        }

        return undefined;
    }

    // #endregion

    // #region Must-not-sleep contexts

    private sourceFiles(): ts.SourceFile[] {
        return this.program
            .getSourceFiles()
            .filter(
                (file) =>
                    !file.isDeclarationFile &&
                    !this.program.isSourceFileFromExternalLibrary(file) &&
                    !this.program.isSourceFileDefaultLibrary(file)
            );
    }

    check() {
        for (const file of this.sourceFiles()) {
            const visit = (node: ts.Node): void => {
                this.checkNode(node);
                ts.forEachChild(node, visit);
            };
            ts.forEachChild(file, visit);
        }
    }

    private checkNode(node: ts.Node) {
        // a function passed to a `@shouldnotsleep` callee, e.g. `SS13.register_signal(x, "y", () => ...)`
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            if (symbolHasTag(this.calleeSymbol(node), SHOULD_NOT_SLEEP)) {
                for (const argument of node.arguments ?? []) {
                    if (isFunctionWithBody(argument)) this.report(argument, `passed to \`${callName(node)}\``);
                }
            }
        }

        // a function assigned to a `@shouldnotsleep` property, e.g. `onActivate:` in an AbilityBuilder
        if (ts.isPropertyAssignment(node) && isFunctionWithBody(node.initializer)) {
            const property = this.contextualPropertyOf(node);
            if (symbolHasTag(property, SHOULD_NOT_SLEEP)) {
                this.report(node.initializer, `assigned to \`${node.name.getText()}\``);
            }
        }

        // a function declared `@shouldnotsleep` itself
        if (isFunctionWithBody(node) && hasTag(node, SHOULD_NOT_SLEEP)) {
            this.report(node, `\`${describeFunction(node)}\` is marked @${SHOULD_NOT_SLEEP}`);
        }
    }

    private contextualPropertyOf(property: ts.PropertyAssignment): ts.Symbol | undefined {
        const literal = property.parent;
        if (!ts.isObjectLiteralExpression(literal)) return undefined;

        const contextual = this.checker.getContextualType(literal);
        if (!contextual) return undefined;

        const name = property.name;
        if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name)) return undefined;

        return this.checker.getPropertyOfType(contextual, name.text);
    }

    private report(fn: FunctionWithBody, context: string) {
        const chain = this.blockingPath(fn);
        // the call that is actually written here — naming the leaf instead would only ever say "`sleep` can sleep"
        const culprit = chain?.[0];
        if (!culprit) return;

        const at = culprit.node;
        // a single-hop chain is already spelled out by the name, so only show the trail when it explains something
        const trail = chain.length > 1 ? `  ${chain.map((hop) => hop.name).join(" → ")}\n` : "";

        this.diagnostics.push({
            file: at.getSourceFile(),
            start: at.getStart(),
            length: at.getWidth(),
            category: ts.DiagnosticCategory.Error,
            code: DIAGNOSTIC_CODE,
            source: "blocking-lint",
            messageText:
                `\`${culprit.name}\` can sleep, but this runs where sleeping is not allowed (${context}).\n` +
                trail +
                "  Defer it with `SS13.set_timeout(0, () => { ... })`.",
        });
    }

    // #endregion
}

/** Runs the whole analysis over a program. Exported for the tests; the plugin hook is the only other caller. */
export function analyze(program: ts.Program): ts.Diagnostic[] {
    const analyzer = new Analyzer(program);
    analyzer.check();
    return analyzer.diagnostics;
}

const plugin: tstl.Plugin = {
    beforeTransform: (program) => analyze(program),
};

export default plugin;
