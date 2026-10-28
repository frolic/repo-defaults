import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import ts from 'typescript';
import { workspacePackages } from "./workspacePackages.js";
const namesInEntity = (name) => ts.isIdentifier(name) ? [ts.idText(name)] : [...namesInEntity(name.left), ts.idText(name.right)];
// The type names a node refers to, outside the bodies of functions and methods.
const typeNamesIn = (node) => {
    if (ts.isBlock(node)) {
        return [];
    }
    const own = ts.isTypeReferenceNode(node)
        ? namesInEntity(node.typeName)
        : ts.isTypeQueryNode(node)
            ? namesInEntity(node.exprName)
            : ts.isImportTypeNode(node) && node.qualifier !== undefined
                ? namesInEntity(node.qualifier)
                : ts.isExpressionWithTypeArguments(node) && ts.isIdentifier(node.expression)
                    ? [ts.idText(node.expression)]
                    : [];
    const children = [];
    ts.forEachChild(node, (child) => {
        children.push(child);
    });
    return [...own, ...children.flatMap(typeNamesIn)];
};
// For each entry file, the names it exports, and whether the signature of another name of the same
// entry refers to it, so the entry has to export it for its API to be complete. A value's signature
// is the type the checker gives it.
const entryExportsOf = (paths) => {
    const program = ts.createProgram(paths, {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2023,
        lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
        types: [],
        strict: true,
        noEmit: true,
        allowImportingTsExtensions: true,
        skipLibCheck: true,
    });
    const checker = program.getTypeChecker();
    const signatureOf = (symbol) => new Set((symbol.declarations ?? []).flatMap((declaration) => {
        if (!ts.isVariableDeclaration(declaration) && !ts.isFunctionDeclaration(declaration)) {
            return typeNamesIn(declaration);
        }
        const node = checker.typeToTypeNode(checker.getTypeOfSymbolAtLocation(symbol, declaration), undefined, ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope);
        return node === undefined ? [] : typeNamesIn(node);
    }));
    return new Map(paths.map((path) => {
        const source = program.getSourceFile(path);
        const module = source === undefined ? undefined : checker.getSymbolAtLocation(source);
        const signatures = (module === undefined ? [] : checker.getExportsOfModule(module)).map((symbol) => ({
            name: symbol.name,
            typeNames: signatureOf(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol),
        }));
        return [
            path,
            signatures.map(({ name }) => ({
                name,
                hasReferrer: signatures.some((other) => other.name !== name && other.typeNames.has(name)),
            })),
        ];
    }));
};
// The TypeScript file an `exports` target points at: the target itself, or the first condition
// that names a TypeScript file, such as `src` or `types`.
const sourceOf = (target) => {
    if (typeof target === 'string') {
        return /\.[cm]?tsx?$/.test(target) && !target.endsWith('.d.ts') ? target : undefined;
    }
    if (typeof target !== 'object' || target === null) {
        return undefined;
    }
    return Object.values(target)
        .map(sourceOf)
        .find((path) => path !== undefined);
};
// The subpaths of an `exports` field with their targets. A string or a map of conditions is the
// target of `.` alone.
const entriesOf = (exports) => {
    if (typeof exports !== 'object' || exports === null) {
        return exports === undefined ? [] : [['.', exports]];
    }
    return Object.keys(exports).some((key) => key.startsWith('.'))
        ? Object.entries(exports)
        : [['.', exports]];
};
const isTestFile = (path) => /\.test\.[cm]?[jt]sx?$/.test(path) || /(?:^|\/)test\//.test(path);
/**
 * Returns each name that an entry of a workspace package exports and nothing uses, as
 * `<specifier>: <name>`. An entry is a key of the package's `exports` whose target, or one of its
 * conditions, is a TypeScript file. A name is used when:
 *
 * - another package of the workspace imports it from that specifier;
 * - the package's README, or a file in `options.docs`, shows it as a code span (`name` or
 *   `name()`), for a name that callers outside the workspace use;
 * - the signature of another name of the same entry refers to it, so a caller can name the type.
 *
 * An import of the whole entry (`import * as` or `import()`) uses every name. Only test files
 * count as users of an entry named `./test`.
 *
 * @example
 * expect(unusedEntryNames(root, { docs: [join(root, 'docs/client.md')] })).toEqual([]);
 */
export function unusedEntryNames(root, options = {}) {
    const packages = workspacePackages(root);
    const codeSpans = (path) => existsSync(path)
        ? [...readFileSync(path, 'utf8').matchAll(/`([A-Za-z_$][\w$]*)(?:\(\))?`/g)].map(([, name]) => name ?? '')
        : [];
    const shared = (options.docs ?? []).flatMap(codeSpans);
    const entries = packages.flatMap((workspacePackage) => entriesOf(workspacePackage.exports).flatMap(([entry, target]) => {
        const source = sourceOf(target);
        return source === undefined
            ? []
            : [
                {
                    workspacePackage,
                    entry,
                    specifier: posix.join(workspacePackage.name, entry),
                    path: join(root, workspacePackage.folder, source),
                },
            ];
    }));
    const exported = entryExportsOf(entries.map(({ path }) => path));
    return entries.flatMap(({ workspacePackage, entry, specifier, path }) => {
        const imports = packages
            .filter((other) => other.folder !== workspacePackage.folder)
            .flatMap((other) => other.files)
            .filter((file) => entry !== './test' || isTestFile(file.path))
            .flatMap((file) => file.imports)
            .filter((found) => found.specifier === specifier);
        if (imports.some(({ names }) => names === undefined)) {
            return [];
        }
        const used = new Set([
            ...imports.flatMap(({ names }) => names ?? []),
            ...shared,
            ...codeSpans(join(root, workspacePackage.folder, 'README.md')),
        ]);
        return (exported.get(path) ?? [])
            .filter(({ name, hasReferrer }) => !hasReferrer && !used.has(name))
            .map(({ name }) => `${specifier}: ${name}`);
    });
}
