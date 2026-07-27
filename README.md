# dreamluau-ts

Write [Dreamluau](https://github.com/tgstation/dreamluau/) scripts for [Space Station 13](https://www.spacestation13.com/) using TypeScript with full type safety.

## Overview

`dreamluau-ts` is a monorepo that lets you write Dreamluau (Luau) scripts in TypeScript and compile them to Luau via [TypeScriptToLua](https://typescripttolua.com/). It provides type definitions for the Dreamluau runtime, the BYOND, and codebase types; bringing type safety to Lua scripting.

> [!IMPORTANT]
> The type definitions in `packages/types` were written against a specific revision of their codebase. Your server may be running a different version, so the types may not perfectly match the code you're targeting. Always verify against your server's actual implementation.

## Getting Started

### Installation

```bash
bun install
```

### Building

```bash
bun run build
```

The compiled Luau output is placed in `packages/scripts/dist/`.

## Usage Example

```typescript
import * as SS13 from "SS13";
import { icon } from "./loader";

const myIcon = icon("https://example.com/icon.dmi");
const human = SS13.new("/mob/living/carbon/human");
```

## Type Definitions

The `packages/types` package (`byond-types`) provides ambient type declarations for:

- **Dreamluau runtime** &mdash; `sleep()`, `loadstring()`, `_exec`, `dm` (world, global_vars, new, type checking)
- **BYOND Types** &mdash; `Byond.Datum`, `Byond.Atom`, `Byond.Mob`, `Byond.Icon`, `Byond.Sound`, `Byond.List`, etc.
- **/tg/station codebase** &mdash; `Byond.Mob.Living.Carbon.Human`, `Byond.Datum.Mind`, etc.

Those types are automatically included in your TypeScript project when you add the following to your `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "types": ["byond-types/tg"] // for /tg/station codebase
  }
}
```

## Planned Features

- **Standalone `byond-types` package** &mdash; `packages/types` will be published as a standalone npm package, so anyone can install it directly in their own TypeScriptToLua projects without needing the full monorepo.
- **Project generator** &mdash; A scaffolding package (similar to `create-app` or `create-dreamluau`) that bootstraps a complete, ready-to-use Dreamluau + TypeScriptToLua project with types, build config, and all.

## Contact

- Discord: `seefaaa`
