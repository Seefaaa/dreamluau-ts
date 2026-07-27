# Contributing to dreamluau-ts

Thanks for your interest in contributing! 🎉

## Pull Request Process

1. Since the project is in its early stages, **direct pushes to `master` are allowed** (even force pushes). Pull requests are also welcome.
2. Before submitting a PR, make sure your code passes all checks (see [Development Setup](#development-setup)).

## Commit Style

No strict commit convention; just write clear, descriptive commit messages.

## Development Setup

```bash
bun install       # install dependencies
bun run build     # verify everything compiles
bun run check     # verify formatting and linting
```

## Code Style

This project uses [Biome](https://biomejs.dev/) for formatting and linting. Before submitting your changes, run:

```bash
bun run check:fix   # auto-format and auto-fix lint issues
```

## Type Definition Guidelines

The most important rule: **type definitions must accurately reflect the actual in-game behavior.** Incorrect or misleading types defeat the purpose of this project.

When adding or modifying type definitions in `packages/types/`, keep these rules in mind:

- **`@noSelf`** — Use `/** @noSelf */`, `/** @noSelfInFile */`, or `(this: void, ...)` where functions should not have a `self` parameter. If a function or method is called with `:` syntax (i.e., it expects `self`), omit `@noSelf`, `@noSelfInFile` or use `(this: T)` at the appropriate scope.
- **`this` parameter** — If a function is intended to be called with `:` syntax (e.g., `datum:someProc()`), it needs a `this` parameter in the type definition. If it's meant to be called with `.` syntax, it should not have one. Pay close attention to how the proc is actually used in the game code.
- **Accuracy first** — Always verify against the actual game codebase. A type that compiles but doesn't match reality is worse than missing types.
- **File placement** — Place types in the appropriate module/namespace under `packages/types/src/`. Codebase-agnostic types go in `dreamluau.d.ts`, codebase-specific types go in `ambient/<codebase>/`.

## Getting Help

If you're unsure about anything, feel free to open an issue or reach out on Discord (`seefaaa`) to discuss your changes first.
