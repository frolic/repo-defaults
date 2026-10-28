import ts from 'typescript';
/**
 * Returns what a TypeScript or JavaScript file takes from other modules: each specifier, with the
 * names the file takes from it. An import of the whole module, such as `import * as name` or
 * `import('name')`, gives `undefined` as its names, and so does `export * from`.
 *
 * @example
 * moduleImports('a.ts', "import { join } from 'node:path';"); // [{ specifier: 'node:path', names: ['join'] }]
 */
export function moduleImports(fileName, text) {
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false);
    const found = [];
    const visit = (node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const bindings = node.importClause?.namedBindings;
            const names = bindings === undefined
                ? node.importClause?.name === undefined
                    ? []
                    : ['default']
                : ts.isNamedImports(bindings)
                    ? bindings.elements.map((element) => (element.propertyName ?? element.name).text)
                    : undefined;
            found.push({ specifier: node.moduleSpecifier.text, names });
        }
        if (ts.isExportDeclaration(node) &&
            node.moduleSpecifier !== undefined &&
            ts.isStringLiteral(node.moduleSpecifier)) {
            const clause = node.exportClause;
            const names = clause !== undefined && ts.isNamedExports(clause)
                ? clause.elements.map((element) => (element.propertyName ?? element.name).text)
                : undefined;
            found.push({ specifier: node.moduleSpecifier.text, names });
        }
        if (ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword &&
            node.arguments[0] !== undefined &&
            ts.isStringLiteral(node.arguments[0])) {
            found.push({ specifier: node.arguments[0].text, names: undefined });
        }
        if (ts.isImportTypeNode(node) &&
            ts.isLiteralTypeNode(node.argument) &&
            ts.isStringLiteral(node.argument.literal)) {
            found.push({ specifier: node.argument.literal.text, names: undefined });
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    for (const reference of source.typeReferenceDirectives) {
        found.push({ specifier: reference.fileName, names: undefined });
    }
    return found;
}
