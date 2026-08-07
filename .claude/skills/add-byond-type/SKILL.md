---
name: add-byond-type
description: Add or extend a BYOND/tgstation type declaration in packages/types — a class for a DM typepath, fields on an existing class, a proc, or an enum/bitflag for macro-valued vars. Use whenever the user says something like "add the /obj/... class", "add the fields of /atom/movable", "add the X proc", or asks why a declaration doesn't type-check against the game code.
---

# Adding BYOND type declarations

Type definitions must match actual in-game behavior. A declaration that compiles but lies is worse than a
missing one — always read the source before writing anything, and check you are reading the right source:
**BYOND builtins are documented at <https://ref.dm-lang.org/>**, addressed by DM path
(`https://ref.dm-lang.org/atom/var/density`), not in any server's `code/`, which only uses them. Codebase types
come from the checkout. Copy those descriptions verbatim too — writing a builtin's doc from memory is how
`world.icon_size` ended up declared `number` when it also accepts a `"[w]x[h]"` string.

**Read `docs/type-declarations.md` first.** It is the reference for all of this: where each kind of declaration
goes, class naming, which fields to take and which to skip, the DM→TypeScript mapping table, enum-versus-bitflag,
signals, global vars and procs, and how to decide a proc's sleeping tag. Two companions it links to,
`docs/tstl-self.md` (`this` and self) and `docs/blocking.md` (the sleeping lint), carry the rest.

What follows is only the part that is about working with the user, not about the codebase.

## Finding the codebase

The DM source lives in a local checkout whose **path is machine-specific**, recorded in the repo's gitignored
`CLAUDE.local.md` (imported by `CLAUDE.md`).

If neither file names a path, **ask the user where their codebase is checked out.** Do not guess a path, and do
not quietly fall back to fetching files from GitHub — the whole point is to read the revision their server runs.

Check `git remote -v` and `git status` in that checkout before trusting the working tree; it is usually a fork
and may be pinned to an older revision than the server. `docs/type-declarations.md` covers what that implies.

## Scope

Stay inside what was asked:

- **Fields only, unless the user names a proc.** Do not add procs on your own initiative.
- **When a missing type forces you to declare a new class, leave it empty.** Adding a field whose type does not
  exist yet means declaring that class — but do not then populate its fields as well unless asked, because that
  cascades without end.
- **If the path the user gave does not exist, say so and find the real one** rather than declaring what they
  asked for. Paths get refactored (`/datum/effect_system/spark_spread` →
  `/datum/effect_system/basic/spark_spread`), and so do proc names. Report it; do not invent.

## Reporting back

State what you verified and against what. If a declaration was written from the pinned working tree rather than
the branch the server runs, say so — the two can differ, and the user is the one who knows which matters.

Anything you could not verify in the DM is worth naming explicitly rather than leaving in the diff silently.

## Verifying

```bash
bun run build                  # the ONLY type check (tstl); `bun run check` is biome, it does not type check
bunx biome check packages      # formatting + lint; --write to fix
```

A newly added `@blocking` can surface `TS90001` in `packages/scripts`, and a newly added field can break a
script that was relying on the field's absence. Both are real findings — see the end of
`docs/type-declarations.md` before working around either.
