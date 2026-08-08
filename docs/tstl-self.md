# tstl and Lua's `self`

In Lua, `a:b()` and `a.b()` are different calls. The colon passes `a` as an implicit first argument; the dot
does not. There is no way to tell from the call site which one a function wants — the two look identical in
TypeScript, and **tstl picks between them from the types alone**.

Getting it wrong is not a compile error. The emitted Lua is valid, it just shifts every argument by one, so a
proc reads the first real argument as `src` and the last one goes missing. That surfaces in game, as nonsense.

Every script package sets `noImplicitSelf: true` in its `tsconfig.json`. That is worth reading precisely,
because it is weaker than it sounds: it changes the default **only where `this` is otherwise unspecified**. It
does not mean nothing takes a self.

Anywhere `this` is actually determined, that wins over the flag — a method on a class, a declaration with an
explicit `this` parameter, a callback whose `this` a `ThisType<...>` supplies. The flag decides the leftovers.

The practical consequence is that `noImplicitSelf` is a default, not a guarantee, and you cannot read a call
site and know which form it compiles to. Only the emitted Lua tells you that.

## Declarations: procs on datums

Dreamluau exposes a datum's procs as methods on the datum, so they are called `closet:open()` from Luau. That
needs an explicit `this` parameter naming the datum:

```ts
open(this: Byond.Obj.Structure.Closet, user?: Byond.Mob.Living): Byond.Bool;
```

Leave it off and tstl emits `closet.open(user)`, and the proc reads `user` as `src`.

Everything that is *not* called on a datum is the other way round — global procs (`dm.global_procs.*`) and the
`SS13` / `list` / `pointer` module functions. Those files carry `/** @noSelfInFile */` at the top, so nothing
in them needs annotating individually. `/** @noSelf */` does the same for one declaration, and
`(this: void, ...)` does it inline; pick one, they do not stack usefully.

Fields never take a `this`.

The short version: **a `this` parameter for anything called with `:`, `@noSelf`/`@noSelfInFile`/`this: void`
for anything called with `.`** — and which one a proc is comes from how the game calls it, not from taste.

## Script code: generic helpers that take callbacks

The same problem bites from the other direction, and this one is genuinely surprising.

Constraining a type parameter with a **call signature** marks the matching callbacks as self-less under
`noImplicitSelf`. Once that has happened, `ThisType<...>` cannot put the self back:

```ts
// ❌ the call signature in the constraint pins down `this`
M extends Record<string, (...args: any[]) => any>
```

```lua
-- `this` in the body compiles to a nil global `self`
{describe = function()
    return self.name
end}
...
z.describe()   -- dot: no self is passed
```

Leaving the shape open lets `ThisType` decide:

```ts
// ✅ don't describe the shape, let `ThisType` decide on its own
M extends Record<string, Function>
```

```lua
{describe = function(self)
    return self.name
end}
...
z:describe()
```

Writing `this: any` into the constraint is only half a fix. The methods do get a self, but calling one method
from **inside** another (`this.describe()`) still comes out as a dot call, because `this` is `any` and tstl has
nothing to go on.

The reverse case matters just as much. When a function you hand to a helper must **not** take a self — a field
that gets called directly, like a `new` on a table — its type needs `this: void`:

```ts
P extends { new: (this: void, ...args: any[]) => unknown }
```

Without it tstl emits `parent:new(...)`, the constructor receives the parent table as its first argument, and
every argument after that is off by one.

## Script code: methods

Class methods are the clearest case of the flag not applying. A method's `this` is the instance type, which is
not implicit, so `noImplicitSelf` leaves it alone and the method gets a self anyway:

```lua
function ZombieAi.prototype.execute(self)   -- class method: takes self
function ____exports.tickLag(worldTime)     -- module function: does not
```

Both of those come out of the same build, in the same file, with `noImplicitSelf: true` set. Nothing is
annotated in either case — the difference is only whether `this` was already determined. So `zombie.execute()`
in TypeScript emits `zombie:execute()`, and there is nothing to do about it.

Watch for the two places that quietly opt out:

- **Arrow functions assigned to fields** are self-less, which is usually what you want for a callback stored in
  an object — `AbilityBuilder.onActivate` is typed `(this: void, …)` for exactly that reason.
- **Getters.** tstl compiles accessors through a metatable descriptor, which pulls
  `__TS__DescriptorGet`/`__TS__SetDescriptor` into the bundle. That is a real cost on a field read in a hot
  loop; a plain public field is free.

## The only way to be sure

Read the generated Lua. On the definition side it is `function(self)` or `function()`; on the call side `a:b()`
or `a.b()`. The two have to match, and nothing else will tell you they do:

```bash
bun run build
grep -n "yourFunction" packages/scripts/zombie/dist/main.lua
```

`dist/main.lua` only contains what is reachable from `index.ts`. To look at a file that nothing imports yet,
copy it into a scratch tstl project with the same `luaTarget` and `noImplicitSelf` and no `luaBundle` — that
emits one `.lua` per file, which is easier to read anyway.
