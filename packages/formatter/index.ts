import {
    CollapseSimpleStatement,
    Config,
    formatCode,
    IndentType,
    LineEndings,
    LuaVersion,
    OutputVerification,
    QuoteStyle,
    SpaceAfterFunctionNames,
} from "@johnnymorganz/stylua";
import type * as ts from "typescript";
import type * as tstl from "typescript-to-lua";

/**
 * Built fresh per file on purpose. `Config` is a wasm-backed handle and `formatCode` takes ownership of it, so a
 * single shared instance works for exactly one call — the second one gets a null pointer and kills the build.
 * A bundle emits one file and never hit this; a `buildMode: "library"` project emits one per source and does.
 */
function makeConfig() {
    const config = Config.new();
    config.collapse_simple_statement = CollapseSimpleStatement.Always;
    config.column_width = 120;
    config.indent_type = IndentType.Spaces;
    config.indent_width = 4;
    config.line_endings = LineEndings.Unix;
    config.quote_style = QuoteStyle.AutoPreferDouble;
    config.space_after_function_names = SpaceAfterFunctionNames.Never;
    config.syntax = LuaVersion.Luau;
    return config;
}

const plugin: tstl.Plugin = {
    beforeEmit(
        _program: ts.Program,
        _options: tstl.CompilerOptions,
        _emitHost: tstl.EmitHost,
        result: tstl.EmitFile[]
    ) {
        for (const file of result) {
            // A `buildMode: "library"` project emits declarations alongside the Lua, and those come through here
            // too. Handing StyLua anything that is not Lua kills the build with "null pointer passed to rust".
            if (!file.outputPath.endsWith(".lua") || typeof file.code !== "string") continue;

            file.code = formatCode(file.code, makeConfig(), undefined, OutputVerification.Full);
        }
    },
};

export default plugin;
