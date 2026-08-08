# Adding type declarations

Everything under `packages/types` is a claim about code that lives somewhere else. Nothing in this repo can
check those claims — the compiler believes them, the lint believes them, and the first place a wrong one shows
up is a runtime error in a live round. **A declaration that compiles but lies is worse than a missing one**,
because a missing declaration stops the build and a wrong one does not.

So the rule that governs all of this: read the source before you write the TypeScript. Not the wiki, not another
declaration that looks similar, not what the name implies. **Which source depends on what you are declaring** —
see [Two sources of truth](#two-sources-of-truth) below, because reaching for the wrong one is how a plausible
declaration ends up wrong.

Two concerns cut across everything here and have their own notes: [`tstl-self.md`](tstl-self.md) for `this` and
self, [`blocking.md`](blocking.md) for `@blocking` and the sleeping lint.

## Two sources of truth

Half of what is declared here is not written in any codebase. `density`, `pixel_x`, `Move`, `world.icon_size`,
the direction constants — those are BYOND's, and grepping a server's `code/` for them turns up uses, never
definitions. Taking a guess from how the game happens to use one is how you end up with a declaration that is
right in the cases you looked at and wrong everywhere else.

| Declaring | Verify against |
| --- | --- |
| BYOND builtins and their semantics — `dreamluau.d.ts` | the DM reference: <https://ref.dm-lang.org/> |
| Anything a codebase defines — `ambient/<codebase>/` | that codebase's DM source, from a local clone |

The reference is a browsable rendering of BYOND's own documentation (community-built, from
[`spacestation13/dm-ref`](https://github.com/spacestation13/dm-ref)). It is where a builtin's default value,
its range, and what the engine does with it are actually written down — including the things that are easy to
get backwards, like `NORTH` being `1` and `SOUTH` being `2`.

Entries are addressed by their DM path, so you can go straight to one:

```text
https://ref.dm-lang.org/atom/var/density
https://ref.dm-lang.org/world/var/icon_size
https://ref.dm-lang.org/atom/movable/proc/Move
```

Copy the description from there the same way you would copy a `///` out of a codebase — verbatim, and quote the
default value with it. Writing the gist from memory is how `world.icon_size` got declared `number` here, when
the reference says it also takes a `"[width]x[height]"` string.

Some Dreamluau surface is in neither place: `dm`, `list`, `pointer`, `_exec`, `sleep()` come from
[dreamluau](https://github.com/tgstation/dreamluau) itself, and the `SS13` / `handler_group` / `state` / `timer`
modules are plain Lua files in the server's `lua/` directory. Read those implementations directly — they are the
only description of themselves there is.

## Reading the game code

For anything a codebase defines, you need a local clone of the one your server runs. Where you keep it is up to
you — nothing in this repo resolves paths into it, so the only thing that matters is that you can `grep` it.

Two things to check before trusting what you read there:

- **It is probably a fork.** `git remote -v` will usually show upstream tgstation and the server's own downstream
  remote as separate. Declarations have to match whichever one is actually running.
- **It may be pinned** to the revision the types were written against, which is named at the bottom of
  `packages/types/src/ambient/tg/index.d.ts`. Convenient for checking what is already declared, useless for
  anything newer. Reach past it with `git show <remote>/<branch>:path/to/file.dm` or
  `git grep <pattern> <remote>/<branch>`.

**Every `grep` below runs from the root of that checkout**, not from this repo.

Finding a type is the first thing you will do, and it has one trap — anchor the pattern, or every subtype
matches too:

```bash
grep -rn "^/obj/structure/closet$" code/
```

A type can also exist without ever having a body block of its own, declared only through an override. Drop the
`$` when the anchored search comes back empty:

```bash
grep -rn "^/obj/item/defibrillator/compact/loaded" code/
```

If a path does not exist at all, find the real one rather than declaring what you expected. Paths get
refactored — `/datum/effect_system/spark_spread` is `/datum/effect_system/basic/spark_spread` now — and so do
proc names.

## Where a declaration goes

| File | What belongs in it |
| --- | --- |
| `packages/types/src/dreamluau.d.ts` | BYOND builtins (`/atom` vars, `Move`, `world`) and the Dreamluau runtime (`dm`, `list`, `sleep`) |
| `ambient/<codebase>/types.d.ts` | classes, their fields and procs |
| `ambient/<codebase>/typepaths.d.ts` | DM typepath string → class, alphabetical |
| `ambient/<codebase>/signals.d.ts` | signals |
| `ambient/<codebase>/globals.d.ts` | `dm.global_vars` and `dm.global_procs` |

The split that matters is the first row against the rest: anything true of *any* BYOND game goes in
`dreamluau.d.ts`, anything true only of one codebase goes under `ambient/`. `tg` is the only codebase shipped
today, so every `ambient/tg/` path here is one instance of that pattern rather than a fixed location.

## Classes

Each path segment becomes PascalCase: `/obj/item/card/id` → `Byond.Obj.Item.Card.Id`, `/datum/http_request` →
`Byond.Datum.HttpRequest`, `/datum/effect_system/basic` → `Byond.Datum.EffectSystem.Basic`.

Avoid names that shadow JS globals — Biome's `recommended` preset includes
`lint/suspicious/noShadowRestrictedNames`, which rejects them. That is why `/datum/weakref` is `Weakref` and
not `WeakRef`.

**Register every new class in `typepaths.d.ts`, alphabetically**, including the intermediate ones. That
registry is what makes `SS13.new("/mob/living/carbon/human")`, `SS13.istype(x, "/obj/item/organ/…")` and
`list.filter(list, path)` return a precise type instead of a union.

An empty class is a perfectly good declaration:

```ts
class Team extends Byond.Datum {}
```

## Fields

**Only declare fields first declared on that type.** In DM, `var/foo = 1` declares a var; a bare `foo = 1` in a
type block is an *override* of an inherited one and belongs on whichever ancestor declares it. The same goes for
procs: `/obj/structure/closet/proc/open` is declared on the closet, while `/obj/structure/closet/dump_contents()`
is an override of `/obj/proc/dump_contents` and belongs on `/obj`.

Getting this wrong is not harmless. Declaring an inherited field on the subtype makes it invisible everywhere
else it actually exists.

**Skip `VAR_FINAL`, `VAR_PRIVATE` and `VAR_PROTECTED`.** They are not meant to be touched from outside, and they
usually have accessors that are — `faction` has `get_faction`, `set_faction`, `add_faction`, `remove_faction`,
`has_faction`. Declare those instead.

**Copy doc comments verbatim, or write none.** Take `///` and trailing `//` comments over exactly as they are,
original wording and casing included. Do not paraphrase, summarise, or invent a description for something the
DM leaves undocumented — an invented comment is the same problem as an invented type, just quieter.

**Never skip a field because its type has no class yet.** Declare the missing class as an empty one and add the
field. Do not then go and populate that new class — it cascades without end.

### Mapping DM types

| DM | TypeScript |
| --- | --- |
| `var/foo = "text"` | `foo: string;` |
| var that is null by default, or can be nulled | `foo: string \| undefined;` |
| `var/foo = TRUE` (writable boolean) | `get foo(): Byond.Bool;` + `set foo(value: Byond.Bool \| boolean);` |
| `var/obj/item/uniform` holding a **typepath** (doc says "Type path of …") | `Byond.Type<Byond.Obj.Item> \| undefined` |
| `var/datum/thing/x` holding an **instance** | `Byond.Datum.Thing \| undefined` |
| indexed list | `Byond.List<number, T>` |
| assoc list (`list(path = count)`) | `Byond.List<Byond.Type<Byond.Obj.Item>, number>` |
| sound file var | `Byond.Sound` (`\| undefined` if a subtype nulls it) |
| a weakref | `Byond.Datum.Weakref<Byond.Obj.Item.Card.Id>` — generic, pass the resolved type |
| var that can hold either a typepath or the datum | `Byond.Datum.IdTrim \| Byond.Type<Byond.Datum.IdTrim> \| undefined` |

The typepath-versus-instance row is the one that bites. DM writes both as `var/datum/thing/x`, and only the doc
comment or the assignments tell you which it holds.

### Macro-valued fields: enum or bitflag?

Never leave a field that holds a `#define` as bare `number`. Which of the two it is comes from how the game
**uses** the field, not from how the macros are written:

- Holds **one value at a time** (`switch(x)`, `x == FOO`, `x = FOO`) → `Enums.X`, declared as
  `enum X { Member = value }` in the `Enums` namespace. This holds even when the defines are `(1 << n)` —
  `Enums.Log` and `Enums.HonorificPosition` are both that case.
- Holds a **combined mask** (`x |= FOO`, `x & FOO`, `x = FOO|BAR`) → `Bitflags.X`, declared as a `namespace X`
  of literal number types plus `type X = Bitflag<[...]>`. `Bitflags.Mobility` is the shape to copy.

The same macro family can be both, in different fields. `ITEM_SLOT_*` is `Enums.ItemSlot` for `internals_slot`
and `pda_slot`, which hold one slot, but would need `Bitflags.ItemSlot` for `slot_flags`, which is a mask.

Enum members keep the DM's order and its `///` comments. Bitflag namespaces use decimal literals
(`type Table = 1; type Glass = 2;`) to match what is already there.

## Procs

Parameters follow the DM signature: optional DM params (the ones with a default) become `?`, and a param
documented as "a string or a list of strings" becomes
`string | Byond.List<number, string> | readonly string[]`. Return `Byond.Bool` where DM returns `TRUE`/`FALSE`,
`| undefined` where it can return null, and `void` where the return value is meaningless.

Two decisions have to be made for every proc, and both break silently if you get them wrong:

**Does it take a `this`?** A proc declared on a datum is called `closet:open()` from Luau and needs an explicit
`this` parameter; anything else must not have one. Full model in [`tstl-self.md`](tstl-self.md).

**Can it sleep?** Read the DM body, in this order:

1. **`set waitfor = FALSE`** (or `= 0`) at the top → **`@async`**, never `@blocking`, whatever the body does.
   Such a proc runs until it first sleeps, then hands itself back to the engine while the caller carries on. Its
   return value is therefore meaningless — control comes back at the first yield, not at the `return` — so
   declare it `void` as well.
2. **`SHOULD_NOT_SLEEP(TRUE)`**, or `SIGNAL_HANDLER` which expands to it
   (`code/__DEFINES/dcs/helpers.dm`) → the codebase guarantees it does not sleep. Leave it untagged.
3. Otherwise look for a blocking call, in the proc and one level down:

```bash
grep -nE "set waitfor|SHOULD_NOT_SLEEP|SIGNAL_HANDLER" code/path/to/file.dm
grep -nE "\b(sleep|stoplag|do_after|input|alert|tgui_alert|tgui_input_[a-z]+)\(" code/path/to/file.dm
```

`stoplag()` inside a `while` loop is the usual shape. The sleeping call is often not in the proc you are
declaring: `/proc/tgui_alert` blocks because `/datum/tgui_alert/proc/wait()` spins on `stoplag(1)`. Anything
that waits on a player — a tgui window, a ghost poll — blocks by definition, and its DM doc usually says so
outright: *"the caller will wait for a response from"*.

The tag goes on the declaration, under whatever doc comment you copied:

```ts
/**
 * Creates a TGUI alert window and returns the user's response.
 * ...
 *
 * @blocking
 */
tgui_alert<T extends string>(user: Byond.Mob | Byond.Client, ...): T | undefined;
```

Only tag the leaves — blocking-ness is inferred transitively, so a proc that merely calls a `@blocking` one
needs nothing. Overloads are separate declarations, so tag **each** one. An untagged blocking proc silently
punches a hole in the lint; [`blocking.md`](blocking.md) has the rest of the model, including the two callback
tags `@shouldnotsleep` and `@async`.

## Signals

Signals live in the `Signals<S extends Byond.Datum>` interface in `signals.d.ts`, **alphabetically**. A script
can add its own without touching the package — the interface is global, so
`declare global { interface Signals<S> { … } }` in a script's `global.d.ts` merges into it.

### Find the define

Signal names are `#define`d with a `COMSIG_` prefix, and the name is the string you pass to
`SS13.register_signal`:

```bash
grep -rn '#define [A-Z_]* "atom_was_attacked"' code/__DEFINES/dcs/signals/
```

### Read the parameters off the sender, not the comment

The define usually carries a comment listing its arguments:

```dm
///from relay_attackers element: (atom/attacker, attack_flags, direction)
#define COMSIG_ATOM_WAS_ATTACKED "atom_was_attacked"
```

Useful, but it is a comment — it drifts. The `SEND_SIGNAL` call is what actually runs:

```bash
grep -rn 'SEND_SIGNAL.*COMSIG_ATOM_WAS_ATTACKED' code/
```

```dm
SEND_SIGNAL(victim, COMSIG_ATOM_WAS_ATTACKED, attacker, attack_flags, direction)
```

Arguments after the signal name map 1:1 onto the parameters after `source`. Anything that can be null gets
`| undefined`, and anything holding a macro gets its `Enums.X` or `Bitflags.X` type rather than bare `number`:

```ts
/** from relay_attackers element: (atom/attacker, attack_flags, direction) */
atom_was_attacked: (
    source: S extends Byond.Atom ? S : never,
    attacker: Byond.Atom,
    attack_flags: Bitflags.Attacker,
    direction: Byond.Direction | undefined
) => Signal;
```

`source: S extends Byond.Atom ? S : never` is how a signal is restricted to the datums that can actually emit
it. Use plain `source: S` when anything can.

### Return values

Most handlers return nothing, which is `Signal`. Some are masked by the caller:

```dm
var/signal_result = SEND_SIGNAL(src, COMSIG_ITEM_PRE_ATTACK, target, user, modifiers, attack_modifiers) | …
if(signal_result & COMPONENT_CANCEL_ATTACK_CHAIN)
    return TRUE
```

That is `Signal<[COMPONENT_CANCEL_ATTACK_CHAIN]>`, where the flag is a bare `type X = 1` declared further down
`signals.d.ts` next to its siblings, under a comment naming the signal it belongs to. `Signal<[…]>` resolves to
`OneBitOf<…> | undefined`, so a handler may return one flag or nothing — not a combination.

### Trait signals

`addtrait x` and `removetrait x` are not listed one by one. Add the trait to the `TraitSignals` interface and
`SignalRegistry` generates both names for it:

```ts
declare interface TraitSignals {
    floored: true;
}
```

Only put a trait there if it really exists in the game. A trait a script invents belongs in that script's `global.d.ts`, or something similar.

## Global vars

`dm.global_vars` is typed by the `GlobalVars` interface in `globals.d.ts`. Three kinds of thing end up there,
and which one you have is decided by how it is declared in DM:

| DM | Goes where |
| --- | --- |
| `SUBSYSTEM_DEF(x)`, `PROCESSING_SUBSYSTEM_DEF(x)` | a `class SSx extends Subsystem` in `types.d.ts`, **and** an `SSx` property on `GlobalVars` itself |
| `GLOBAL_LIST_EMPTY(x)`, `GLOBAL_LIST_INIT(x, …)` | a property on `GlobalVars.GLOB` |
| `GLOBAL_VAR(x)`, `GLOBAL_VAR_INIT(x, …)` | a property on `GlobalVars.GLOB` |

Only subsystems sit at the top level, because only they are reached as `dm.global_vars.SSlua`. Everything the
game declares with a `GLOBAL_*` macro is `GLOB.x` in DM and `dm.global_vars.GLOB.x` here, list or not.

```bash
grep -rn "SUBSYSTEM_DEF(mobs)" code/
grep -rn "GLOBAL_LIST_INIT(cardinals" code/
```

Lists need their key type as well as their value type, and that comes from how the game indexes them — an
indexed list is `Byond.List<number, T>`, an assoc list is keyed by whatever is used as the key:

```ts
GLOB: {
    cardinals: Byond.List<number, Byond.Direction.Cardinal>;
    /** all ckeys with associated client */
    directory: Byond.List<string, Byond.Client>;
};
```

## Global procs

`dm.global_procs` is typed by the `GlobalProcs` interface, further down the same file. This is where the
`/proc/` definitions go — both the real helpers and the SDQL wrappers that exist so `call()` can reach BYOND
builtins:

```ts
_get_dist(from: Byond.Atom, to: Byond.Atom): number;
/** Direction `0` is the standard shorthand for "the turf `ref` is standing on". */
_get_step(ref: Byond.Atom, direction: Byond.Direction | 0): Byond.Turf | undefined;
```

The interface is marked `@noSelf`, so nothing in it takes a `this`. That is correct — global procs are called
as `dm.global_procs.foo(…)`, never on a datum. The sleeping decision above applies here in full.

## Constraining a parameter to a typepath

In script code, to say "a typepath of T", use `PathsOf<T>` from `typepaths.d.ts`:

```ts
export function foamSpawner<T extends PathsOf<Byond.Datum.Reagent>>(reagnent: T, ...)
```

Do **not** put a conditional type in the parameter position
(`reagnent: TypePathRegistry[T] extends Byond.Datum.Reagent ? T : never`). It stays unresolved inside the
function body, so `SS13.type()` on it widens to a union of unrelated registry types and fails to assign.

`TypePathOf<T>` is a different helper: it requires an exact match and rejects subtypes.

## Verifying

```bash
bun run build
```

**`bun run build` is the type check.** It runs tstl over every script package, and over all of each one's files
rather than only what its entry imports, so a broken declaration surfaces even if nothing currently uses it.
`bun run check` is Biome — formatting and lint, no type checking at all.

Two kinds of failure are worth expecting rather than working around:

- **A new `@blocking` tag makes `bun run build` report `TS90001` in `packages/scripts`.** That is a real bug
  being found — a blocking call reachable from a signal handler. Defer it, do not drop the tag.
- **A new field makes an existing script stop compiling.** Usually that means the field's real home is a
  different class in the hierarchy. That is information, not a reason to declare it on the wrong one.
