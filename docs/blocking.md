# Blocking calls and the sleeping lint

Some code in this project is allowed to wait; some is not. Getting that wrong is not a compile error on its own —
it breaks in game, usually only sometimes. `bun run build` now checks it, and this note explains the model the
check is built on.

## How sleeping works in BYOND

`sleep()` does not block a thread. A proc that sleeps **yields itself**: it stops where it is, the engine carries
on running everything else, and the proc is resumed later. Nothing is frozen, and nothing else waits for it.

Scripts almost never call `sleep()` directly. What they call are procs that sleep on their behalf, because they
are waiting on something that has not happened yet — a player clicking a button in a tgui window, a ghost poll
running out its timer. Those are the *blocking* procs: `tgui_input_text`, `tgui_input_list`, `tgui_alert`,
`SSpolling.poll_ghost_candidates`, and on the Lua side `SS13.await`, `SS13.wait`, `SS13.check_tick`.

So a proc is blocking when calling it might not return before it has yielded at least once.

There is one way out of that on the DM side: `set waitfor = FALSE`. Such a proc runs normally until it first
sleeps, and at that point control goes straight back to the caller while the engine keeps the rest of it going.
Calling one therefore never blocks you, however much it sleeps internally — and its return value means nothing,
since the caller is handed control at the first yield rather than at the `return`. Declare those `void` and tag
them `@async`.

## Where sleeping is not allowed

A signal handler runs synchronously, inside the `SEND_SIGNAL` that raised it. There is no scheduler waiting to resume it

Anything invoked from a handler inherits the restriction, however deep. That is what makes this hard to spot by
eye: the handler itself looks harmless, and the sleeping call is three or four frames down.

## The escape hatch

Defer the work instead of doing it inline. `invokeAsync` (`src/common/async.ts`) wraps
`SS13.set_timeout(0, ...)`, which schedules the callback on the next tick, in a fresh context that *is* allowed to
sleep. It is the direct equivalent of DM's `INVOKE_ASYNC`.

```ts
SS13.register_signal(mob, "species_gain", (source) => {
    invokeAsync(() => {
        const [answer] = SS13.await(SS13.global_proc, "tgui_alert", source, "Join?", "Zombie", ["Yes", "No"]);
        // ...
    });
    return 0;
});
```

Use `set_timeout` directly when the delay itself matters (`SS13.set_timeout(60, ...)` for "in six seconds");
`invokeAsync` when you only want to get out of the handler. Either way the callback runs *later*, so check that
whatever it captured is still valid — `SS13.is_valid(mob)` — instead of assuming it is.

## The lint

`packages/blocking-lint` is a tstl plugin. It runs in `beforeTransform`, so it gets the full `ts.Program` and
reports through the same diagnostics channel as type errors: a violation fails `bun run build`.

Three JSDoc tags drive it. All three go on the declaration of the thing being **called**, never at the call site:

| Tag | Written on | Means |
| --- | --- | --- |
| `@blocking` | a function or proc declaration | Calling this may sleep. |
| `@async` | a function or proc declaration | Calling this never blocks the caller — DM's `set waitfor = FALSE`, or a Lua helper that defers its work. Function arguments passed here are in the same position, so they may sleep too. |
| `@shouldnotsleep` | a function declaration | Function arguments passed here must not sleep. |
| `@shouldnotsleep` | a property or method signature | Whatever function is assigned here must not sleep. |

Only the leaves need `@blocking`. Everything else is inferred: a function that reaches a `@blocking` declaration
through any chain of calls is treated as blocking too. `icon()` is never tagged, for instance — the plugin works
out that it sleeps because it polls an HTTP request in a `while` loop.

`@async` is the one tag that stops the search rather than feeding it. A call to an `@async` declaration is never
blocking, whatever is inside it — which is exactly what `set waitfor = FALSE` and `set_timeout` both do, from
opposite ends.

The report names the call you actually wrote, then shows the chain that makes it blocking — the part you cannot
see from the call site:

```text
src/zombie-event/mutation.ts(141,17): error TS90001: `setClass` can sleep, but this runs where sleeping is not allowed (passed to `register_signal`).
  setClass → grantAbility → icon → sleep
  Defer it with `SS13.set_timeout(0, () => { ... })`.
```

The chain is omitted when the offending call is itself tagged `@blocking`, since there is nothing to explain.

Method calls are resolved through the class hierarchy, so a call to a base method also considers every override of
it — `previousClass.onLoss(mutation)` is typed as `ZombieClass.onLoss` but the plugin still sees `Boomer.onLoss`.

Because the plugin lives in a package that is loaded from its build output (`main: "./dist/index.js"`), editing
`packages/blocking-lint/index.ts` has no effect until you build it (`bun run --filter blocking-lint build`).

### What it does not catch

- **Callbacks stored and called later.** A function put in an array or a field and invoked through that field is
  not connected to its call sites. `MutationData.cleanup` is that case in this codebase.
- **Anything behind `loadstring`** or another opaque indirection.
- **Static method overrides.** Only instance methods are matched across a class hierarchy.
- **Over-approximation, in the other direction.** An inline callback argument is assumed to run synchronously
  unless its callee is `@async`, so a genuinely deferred callback passed to some other helper would be reported.
  The fix is to tag that helper `@async`, which is what it deserves anyway.
