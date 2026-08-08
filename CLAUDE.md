# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Machine-specific setup — above all, where the target game codebase is checked out — lives in a gitignored
local file: @CLAUDE.local.md

## Commands

```bash
bun install          # install (bun workspaces)
bun run build        # tstl compile of every script package  (ALSO the only type check)
bun run build:zombie # one script; its `prebuild` still rebuilds `@scripts/common` first
bun run check        # biome format + lint check (what CI runs)
bun run check:fix    # biome auto-fix
bun run test         # bun test — only `packages/linter` has any
```

There is no separate `tsc --noEmit` script. **`bun run build` is the type check**; `bun run check` is Biome and
does not type check.

`bun test` covers `packages/linter` only; the game scripts have no tests and are not meant to grow any
(they can only be exercised in a running server). The lint plugin is the exception because it is ordinary
compiler-API code whose failure mode is silent — a broken analysis stops reporting, and a clean build then looks
identical to success.

`bun run build` fans out over **every** package under `packages/scripts` (`--filter '@scripts/*'`) — every
script that exists plus `@scripts/common` — so adding a script needs no change here. It type checks each one,
and within a package every file under `src` rather than only what the entry imports (`include: ["src"]`).

Each script also has a `prebuild` that rebuilds `@scripts/common` first, so building one on its own
(`bun run build:zombie`) is safe too. That means `common` compiles twice during a full `bun run build` — once
from the filter and once from the prebuild. It is seven files; the duplication buys the guarantee that no path
can produce a bundle from a stale `common/dist`. See *How `common` reaches a script's bundle* below for what
goes wrong without it.

## Architecture

Bun workspace monorepo. Three top-level packages, plus one package per script under `packages/scripts/`:

- **`packages/types`** (`byond-types`) — ambient `.d.ts` only, no runtime code. Consumed via `tsconfig.json`
  `"types": ["byond-types/tg"]`.
- **`packages/scripts/<name>`** — one package per script, each compiled TS → Luau by
  [TypeScriptToLua](https://typescripttolua.com/) (`tstl`, `luaTarget: "Luau"`) into its own
  `<name>/dist/main.lua`. `bun run build` builds all of them (`--filter '@scripts/*'`), so a new script needs no
  wiring anywhere. `@scripts/zombie` is the real one.
- **`packages/scripts/template`** (`@scripts/template`) — the starting point for a new script, and a real built
  package rather than an inert folder: a change to the shared build setup that would break a new script breaks
  `bun run build` here instead of waiting to be found. Copy it, rename it in its `package.json`, `bun install`.
- **`packages/scripts/common`** (`@scripts/common`) — shared helpers, built as a **tstl library**
  (`buildMode: "library"`): it emits one `.lua` per source plus declarations into its own `dist`, and a script
  resolves those through `node_modules` and pulls them into its bundle. Its tstl codegen options must mirror
  `packages/scripts/tsconfig.base.json` — a library compiled with different settings than its consumer produces
  Lua that does not match how the consumer calls it.
- **`packages/formatter`** — a `tstl` plugin (`luaPlugins: [{ "name": "formatter" }]`) that runs StyLua over the
  emitted Lua in `beforeEmit`. **It is loaded from its build output** (`main: "./dist/index.js"`), so editing
  `packages/formatter/index.ts` has no effect until you run `bun run --filter formatter build` — `bun run build`
  keeps using the stale `dist`. Two things in it look redundant and are not: it skips non-`.lua` emit files
  (a library project emits declarations through the same hook) and it builds a fresh StyLua `Config` per call
  (`Config` is a wasm handle that `formatCode` consumes, so a shared one dies on the second file). Both only
  bite when a project emits more than one file, which is why a bundle-only setup never hit them.
- **`packages/linter`** — the `tstl` lint plugin. It carries one rule today, `blocking`, which reports blocking
  calls made from must-not-sleep contexts, driven by the `@blocking` / `@shouldnotsleep` / `@async` JSDoc tags.
  It runs in `beforeTransform` and emits `ts.Diagnostic`s (`TS90001`, source `linter/blocking`), so a violation
  fails `bun run build`. Loaded from `dist` too — same rebuild caveat as `formatter`, though `index.test.ts`
  runs against the source and needs no build. See `docs/blocking.md`.

### Script bundling

`tstl` bundles everything reachable from a script's `index.ts` into a single `<script>/dist/main.lua`. Scripts
are **not** meant to be bundled together, which is why each is its own package with its own entry and output —
there is no shared entry file to switch between them.

Shared build settings live in **`packages/scripts/tsconfig.base.json`**, which each script extends; a script's
own `tsconfig.json` carries `rootDir`, `outDir` and `include`. tstl merges the `tstl` block along the `extends`
chain, so the plugin list and bundle options only exist once. Note that **TypeScript resolves relative options
against the file that declares them while tstl resolves some against the root config's directory**, so anything
path-shaped is safer per-script: `luaBundleEntry: "./src/index.ts"` works in the base only because tstl resolves
it the second way.

**A script's `rootDir` is `"."`, not `"./src"`, and that is load-bearing.** Bundle module keys are paths
relative to `rootDir`, so `.` keeps the `src.` prefix (`src/ai.ts` → `src.ai`) while `./src` would flatten them
to `ai`. Flat keys let a source file shadow a real Dreamluau module, because the bundle's loader checks its own
table first:

```lua
if ____modules[file] then ... else ____originalRequire(file) end
```

Verified: with a flat layout, adding `src/state.ts` puts `["state"]` in the bundle and every `require("state")`
in it — meant for the engine's module — gets the script's file instead. tstl emits no warning and the build
exits 0. The `src.` prefix makes the collision impossible; keep it. `rootDir` also has to be explicit either
way, since TS 6 rejects an inferred one (`TS5011`).

### How `common` reaches a script's bundle

`@scripts/common` is a `buildMode: "library"` project, so a script consumes its **emitted `.lua`**, not its
sources. Two pieces make that resolve, and both are easy to get subtly wrong:

- **`common`'s `exports` targets carry no extension.** tstl's resolver is enhanced-resolve configured with
  `extensions: [".lua"]` and `enforceExtension: true`, so it appends `.lua` itself. Writing `./dist/*.lua`
  makes it look for `dist/globals.lua.lua`. The map is `{ "types": "./dist/*.d.ts", "tstl": "./dist/*",
  "default": "./dist/*" }` — TypeScript takes `types`, tstl matches `tstl` (its condition list is
  `["require", "node", "tstl", "default"]`).
- **`@scripts/common` is a `dependency`, not a `devDependency`.** That is what makes `bun run --filter
  '@scripts/*' build` order the two builds; under `devDependencies` bun runs them concurrently and a clean
  checkout fails, because `zombie` resolves before `common/dist` exists. The failure is loud but misleading —
  the unresolved module also strips the `@async` tag off `invokeAsync`, so the lint reports bogus `TS90001`s
  on top of the real `TS2307`.

Because module keys come from the resolved path, `common`'s modules appear in the bundle as
`lua_modules.@scripts.common.dist.globals` — tstl's own name for the node_modules segment. Ugly, but nothing
outside the bundle refers to them, and the prefix keeps them clear of the script's flat keys.

**The hazard this creates, and how it is contained:** because the script bundles `common`'s *emitted* Lua, a
`common` edit that has not been recompiled produces a bundle without the change — silently, exit code 0. Same
stale-`dist` trap as `formatter` and `linter`, but on code that changes far more often.

Every script's `prebuild` therefore rebuilds `@scripts/common` before its own `tstl` run, so both `bun run
build` and `bun run build:zombie` are safe. A new script package must carry that `prebuild` too — which is why
new scripts should start from `packages/scripts/template` rather than from scratch. The template is itself a
built package, so a change to the shared build setup that would break a new script breaks `bun run build`
instead of waiting to be discovered.

`packages/scripts/<name>/lua/*.lua` are the original hand-written Luau scripts being ported to TypeScript —
reference material, not build inputs.

TS features that need tstl's runtime helpers (`class`, `instanceof`, most `Array`/`String` methods) pull in
lualib. `luaLibImport: "require-minimal"` keeps that to the handful of helpers actually used — the default
(`"require"`) inlines the whole ~2900-line lualib into `main.lua` as soon as anything touches it.

**Circular imports are fatal, and `verbatimModuleSyntax` must stay off** (`tsconfig.base.json`). The bundle's
loader writes `____moduleCache[file]` *after* the module body returns, so two modules that `require` each other
recurse forever instead of seeing a partial export — a stack overflow at load. With `verbatimModuleSyntax: true`
tstl emits a `require` even for `import type`, so a types-only edge is enough to trigger it; with it off, TS
elides any import whose bindings are unused as values. To break a cycle that is genuinely types-only, an inline
`import("./mod").Thing` type is always erased (see `controller.ts`'s `setClass` parameter).

### Type layering

`packages/types/src/index.d.ts` (codebase-agnostic: `luau.d.ts`, `dreamluau.d.ts`, `utils.d.ts`) is referenced by
`ambient/tg/index.d.ts`, which adds /tg/station-specific declarations. New codebases would get their own
`ambient/<codebase>/` directory and package export. `tg` is the only one shipped today, so every `ambient/tg/`
path below is one instance of that pattern rather than a fixed location.

Almost everything is global/ambient. The exceptions are declared modules — `SS13`, `SS13_base`, `handler_group`,
`state`, `timer` — marked `@noResolution` because they resolve to Lua modules that exist in-game, not to anything
in `node_modules`. They are imported normally: `import * as SS13 from "SS13"`.

The Dreamluau runtime surface (`dm`, `list`, `pointer`, `_exec`, `sleep()`) lives in `dreamluau.d.ts`. Its
`GlobalVars` / `GlobalProcs` interfaces are deliberately empty there and filled per codebase in
`ambient/tg/globals.d.ts` — that is why `dm.global_vars.SSlua` type-checks.

### Key type-system pieces

- **`TypePathRegistry`** (`ambient/tg/typepaths.d.ts`) maps DM type path strings to `Byond.*` classes. It is what
  makes `SS13.new("/mob/living/carbon/human")`, `SS13.istype(x, "/obj/item/organ/zombie_infection")` and
  `list.filter(list, path)` return precise types. **Keep entries alphabetical.**
- **`Signals<S>` / `SignalRegistry<S>`** (`ambient/tg/signals.d.ts`) type `register_signal` / `unregister_signal`
  and `HandlerGroup`. `SignalRegistry` also synthesizes `addtrait <x>` / `removetrait <x>` signal names from the
  `TraitSignals` interface, which individual scripts augment (see `packages/scripts/zombie/src/global.d.ts`). Signal return
  types use `Signal` or `Signal<[FLAG, ...]>` for bitflag-returning signals. **Keep entries alphabetical.**
- `packages/types/src/utils.d.ts` holds the type-level helpers (`Bitflag`, `OneBitOf`, `MethodsOf`, `ReturnsWhen`).

`docs/type-declarations.md` covers extending these — follow it when adding signals, global vars or global procs.

## Dreamluau runtime constraints

These shape how script code must be written; violating them produces runtime errors, not compile errors.

- **Signal handlers run synchronously and must not call sleeping procs.** Wrap anything that sleeps (tgui inputs,
  `SS13.await`, etc.) in `SS13.set_timeout(0, () => { ... })` or `invokeAsync`. `bun run build` enforces this via
  `packages/linter` and the `@blocking` / `@shouldnotsleep` / `@async` tags — blocking-ness is inferred
  transitively, so only the leaves are tagged. See `docs/blocking.md`.
- **Luau state globals persist across executions**, so scripts use `declare var x` in a script-local `global.d.ts`
  plus `x ??= ...` / `x = x ?? {}` at module scope to survive re-runs (`packages/scripts/common/src/web-loader.ts`,
  `packages/scripts/zombie/src/globals.ts`).
- **Tick budget:** `world.tick_usage` is not refreshed during consecutive Luau execution, so use
  `makeClock()` / `checkTick()` from `packages/scripts/common/src/tick.ts` (they compute usage from `_exec.time` and
  `dm.world.tick_lag`) in any loop over many objects.
- DM procs return `0`/`1`, not booleans — `packages/scripts/common/src/globals.ts` wraps the common ones
  (`has_trait`, `prob`, `isSpecies`) to convert.
- Bit operations go through `_G.bit32` (`bor`, `band`, `bnot`).
- **The types decide whether tstl emits `a:b()` or `a.b()`**, in script code as much as in declarations.
  `noImplicitSelf` only sets the default where `this` is unspecified — class methods still take a self, since
  their `this` is the instance type. A generic helper that constrains a callback with a call signature silently
  makes it self-less. Reading the emitted Lua is the only way to be sure. See `docs/tstl-self.md`.

## Type definition rules

The key rule is that **type definitions must match actual in-game behavior**; a type that compiles but lies is
worse than a missing type. Verify before adding — but against the right thing:

- **BYOND builtins** (`dreamluau.d.ts` — `density`, `pixel_x`, `Move`, `world.icon_size`, the direction
  constants) are documented at <https://ref.dm-lang.org/>. A server's `code/` only *uses* them; inferring a
  builtin's semantics from one usage is how `Byond.Direction` ended up with `NORTH` and `SOUTH` swapped.
- **Codebase types** (`ambient/<codebase>/`) come from that codebase's DM source — the local checkout below.
- **Dreamluau and the `lua/` modules** describe themselves; read their implementations.

Full version in `docs/type-declarations.md`.

### The game codebase (local checkout)

Verifying a proc, signal, or global var means reading the target server's DM source. Work from a local checkout
of it rather than fetching files from GitHub.

**Its path is machine-specific and is recorded in `CLAUDE.local.md`** (gitignored, imported at the top of this
file). If that file does not exist, **ask the user where their codebase is checked out** — do not guess a path,
and do not quietly fall back to fetching from the web.

What to expect of that checkout, whatever the server:

- **It is probably a fork.** Run `git remote -v`: upstream tgstation and the server's own downstream fork are
  usually separate remotes, and the declarations have to match whichever one the server actually runs.
- **It may be pinned** to the revision the types were written against (see `ambient/tg/index.d.ts`) rather than
  tracking the server. That is convenient for checking existing declarations, but anything newer or
  fork-specific will not be in the working tree — reach it with `git show <remote>/<branch>:path/to/file.dm` or
  `git grep <pattern> <remote>/<branch>`. Check `git status` before trusting the tree.
- **`lua/`** holds the real `SS13.lua`, `SS13_base.lua`, `handler_group.lua`, `state.lua`, `timer.lua` — the
  implementations that `packages/types/src/ambient/tg/*.d.ts` mirrors. Check `self` usage (`:` vs `.`) against
  these rather than guessing.
- **Signal defines** live in `code/__DEFINES/dcs/signals/`. The grep recipes in `docs/type-declarations.md` are
  written to run from the root of that tree, not from this repo.

- `@noSelf` / `@noSelfInFile` / `(this: void, ...)` for functions called with `.`; a `this` parameter for procs
  called with `:` (i.e. methods on `Byond.Datum` subclasses). Getting this wrong compiles fine and breaks in game.
- **Every proc declaration needs a sleeping decision.** The order to check is `set waitfor = FALSE` → `@async`
  and `void` (the proc runs until its first sleep, then hands itself back to the engine, so the caller never
  blocks and the return value is meaningless) → `SHOULD_NOT_SLEEP(TRUE)` / `SIGNAL_HANDLER` (guaranteed not to
  sleep, leave untagged) → otherwise grep the body and one level down for `sleep` / `stoplag` / `do_after` /
  `input` / `tgui_*` and tag `@blocking`. Tag every overload, and only the leaves —
  `packages/linter` infers the rest transitively. Declarations that take a Lua callback get
  `@shouldnotsleep` when it runs synchronously (`register_signal`) or `@async` when it is deferred
  (`set_timeout`). An untagged blocking proc silently defeats the check. See `docs/blocking.md`.
- Codebase-agnostic types → `packages/types/src/dreamluau.d.ts`; codebase-specific → `packages/types/src/ambient/<codebase>/`.
- The tg types were written against one specific tgstation revision, named at the bottom of
  `packages/types/src/ambient/tg/index.d.ts` — that comment is the source of truth for which one. A target
  server will usually be running something else.

## Style

Biome, configured at the root with per-package `biome.json` files that `extends: "//"` (`root: false`).
TS/JS uses **4-space indent**, double quotes, semicolons, 120 columns; JSON/config uses 2-space.
