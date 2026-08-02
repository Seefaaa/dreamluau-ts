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

const config = Config.new();
config.collapse_simple_statement = CollapseSimpleStatement.Always;
config.column_width = 120;
config.indent_type = IndentType.Spaces;
config.indent_width = 4;
config.line_endings = LineEndings.Unix;
config.quote_style = QuoteStyle.AutoPreferDouble;
config.space_after_function_names = SpaceAfterFunctionNames.Never;
config.syntax = LuaVersion.Luau;

const plugin: tstl.Plugin = {
    beforeEmit(
        _program: ts.Program,
        _options: tstl.CompilerOptions,
        _emitHost: tstl.EmitHost,
        result: tstl.EmitFile[]
    ) {
        for (const file of result) {
            const formatted =
                process.env.NODE_ENV !== "production"
                    ? formatCode(file.code, config, undefined, OutputVerification.Full)
                    : file.code;

            file.code = formatted;
        }
    },
};

export default plugin;
