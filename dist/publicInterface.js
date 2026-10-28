import ts from 'typescript';
const printer = ts.createPrinter({ removeComments: true });
// Drops `export` and `declare`, so a declaration reads the same wherever it was written.
const withoutExport = (modifiers) => modifiers?.filter((modifier) => modifier.kind !== ts.SyntaxKind.ExportKeyword &&
    modifier.kind !== ts.SyntaxKind.DeclareKeyword);
// A class without its member bodies and initializers: the signature a caller compiles against.
const classSignature = (declaration) => ts.factory.updateClassDeclaration(declaration, withoutExport(declaration.modifiers), declaration.name, declaration.typeParameters, declaration.heritageClauses, declaration.members.flatMap((member) => {
    if (ts.isPropertyDeclaration(member)) {
        return [
            ts.factory.updatePropertyDeclaration(member, member.modifiers, member.name, member.questionToken ?? member.exclamationToken, member.type, undefined),
        ];
    }
    if (ts.isMethodDeclaration(member)) {
        return [
            ts.factory.updateMethodDeclaration(member, member.modifiers, member.asteriskToken, member.name, member.questionToken, member.typeParameters, member.parameters, member.type, undefined),
        ];
    }
    if (ts.isConstructorDeclaration(member)) {
        return [
            ts.factory.updateConstructorDeclaration(member, member.modifiers, member.parameters, undefined),
        ];
    }
    return ts.isClassStaticBlockDeclaration(member) ? [] : [member];
}));
// The values a type is derived from with `typeof`, such as the schema behind
// `type Author = typeof Author.Type`.
const typeQueriesOf = (node) => {
    if (ts.isTypeQueryNode(node)) {
        let name = node.exprName;
        while (ts.isQualifiedName(name)) {
            name = name.left;
        }
        return [name];
    }
    return node.getChildren().flatMap(typeQueriesOf);
};
const indented = (text) => text.replaceAll(/\n(?=.)/g, '\n  ');
/**
 * Prints the public interface of a package's entry files through the TypeScript compiler. Each
 * entry's specifier comes first, followed by a block for each name it exports, sorted by name.
 *
 * - A type or a namespace prints as it was declared.
 * - A type derived with `typeof` also prints the value it comes from.
 * - A class prints without its bodies.
 * - A function or a const prints with the type the compiler gives it.
 *
 * A named type inside a signature stays a name, so a change to a type that isn't exported doesn't
 * show.
 *
 * Compare the result with a committed file, so a diff of that file is the diff of the interface.
 * In vitest, `toMatchFileSnapshot` does this, and `-u` rewrites the file once the owner agrees to
 * the change.
 *
 * @example
 * await expect(
 *   publicInterface([{ specifier: '@acme/sdk', path: join(root, 'packages/sdk/src/index.ts') }]),
 * ).toMatchFileSnapshot('./publicInterface.txt');
 */
export function publicInterface(entries, options = {}) {
    const program = ts.createProgram(entries.map(({ path }) => path), {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2023,
        lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
        types: [],
        strict: true,
        noEmit: true,
        allowImportingTsExtensions: true,
        skipLibCheck: true,
        ...options.compilerOptions,
    });
    const checker = program.getTypeChecker();
    const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
    const valueType = (symbol, declaration) => {
        const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
        const node = checker.typeToTypeNode(type, declaration, ts.NodeBuilderFlags.NoTruncation |
            ts.NodeBuilderFlags.MultilineObjectLiterals |
            ts.NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope |
            ts.NodeBuilderFlags.IgnoreErrors);
        return node === undefined
            ? checker.typeToString(type, declaration, ts.TypeFormatFlags.NoTruncation)
            : print(node, declaration.getSourceFile());
    };
    const derivedFrom = (declaration) => typeQueriesOf(declaration.type).flatMap((identifier) => {
        const value = checker.getSymbolAtLocation(identifier)?.valueDeclaration;
        return value !== undefined &&
            ts.isVariableDeclaration(value) &&
            value.initializer !== undefined
            ? [`const ${value.name.getText()} = ${print(value.initializer, value.getSourceFile())}`]
            : [];
    });
    const linesOf = (declaration, symbol, isTypeOnly) => {
        const source = declaration.getSourceFile();
        if (ts.isTypeAliasDeclaration(declaration)) {
            const alias = ts.factory.updateTypeAliasDeclaration(declaration, withoutExport(declaration.modifiers), declaration.name, declaration.typeParameters, declaration.type);
            return [print(alias, source), ...derivedFrom(declaration)];
        }
        if (ts.isInterfaceDeclaration(declaration)) {
            const updated = ts.factory.updateInterfaceDeclaration(declaration, withoutExport(declaration.modifiers), declaration.name, declaration.typeParameters, declaration.heritageClauses, declaration.members);
            return [print(updated, source)];
        }
        if (ts.isClassDeclaration(declaration)) {
            return [print(classSignature(declaration), source)];
        }
        if (ts.isModuleDeclaration(declaration)) {
            const namespace = ts.factory.updateModuleDeclaration(declaration, withoutExport(declaration.modifiers), declaration.name, declaration.body);
            return [print(namespace, source)];
        }
        if (isTypeOnly) {
            return [];
        }
        if (ts.isVariableDeclaration(declaration) || ts.isFunctionDeclaration(declaration)) {
            return [`const ${symbol.name}: ${valueType(symbol, declaration)}`];
        }
        return [];
    };
    const blockOf = (exported) => {
        const isTypeOnly = exported.declarations?.some((declaration) => ts.isTypeOnlyImportOrExportDeclaration(declaration)) ?? false;
        const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
        const lines = (symbol.declarations ?? []).flatMap((declaration) => linesOf(declaration, symbol, isTypeOnly));
        return [...new Set(lines)].map((line) => `  ${indented(line)}`).join('\n');
    };
    return `${entries
        .flatMap(({ specifier, path }) => {
        const source = program.getSourceFile(path);
        if (source === undefined) {
            throw new RangeError(`${path} is not a TypeScript file the compiler can read.`);
        }
        const module = checker.getSymbolAtLocation(source);
        const exported = (module === undefined ? [] : checker.getExportsOfModule(module)).toSorted((left, right) => left.name.localeCompare(right.name));
        return [specifier, ...exported.map(blockOf)];
    })
        .join('\n\n')}\n`;
}
