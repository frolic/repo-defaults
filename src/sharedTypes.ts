import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import ts from 'typescript';
import { workspacePackages } from './workspacePackages.ts';

type FileExports = {
  values: Set<string>;
  types: Set<string>;
  reexports: { name: string | undefined; from: string; specifier: string }[];
};

const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword);

// The names a file declares and exports, as values or types, and what it re-exports from where.
const exportsOf = (path: string, text: string): FileExports => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false);
  const found: FileExports = { values: new Set(), types: new Set(), reexports: [] };
  const localTypes = new Set(
    source.statements.flatMap((statement) =>
      ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)
        ? [statement.name.text]
        : [],
    ),
  );
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const specifier =
        statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      const clause = statement.exportClause;
      if (clause === undefined && specifier !== undefined) {
        found.reexports.push({ name: undefined, from: '*', specifier });
      }
      for (const element of clause !== undefined && ts.isNamedExports(clause)
        ? clause.elements
        : []) {
        const local = (element.propertyName ?? element.name).text;
        if (specifier !== undefined) {
          found.reexports.push({ name: element.name.text, from: local, specifier });
        } else if (statement.isTypeOnly || element.isTypeOnly || localTypes.has(local)) {
          found.types.add(element.name.text);
        } else {
          found.values.add(element.name.text);
        }
      }
    } else if (isExported(statement)) {
      if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
        found.types.add(statement.name.text);
      } else if (ts.isVariableStatement(statement)) {
        for (const { name } of statement.declarationList.declarations) {
          if (ts.isIdentifier(name)) {
            found.values.add(name.text);
          }
        }
      } else if (
        (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        statement.name !== undefined
      ) {
        found.values.add(statement.name.text);
      }
    }
  }
  return found;
};

// The TypeScript file an `exports` target points at, as in unusedEntryNames.
const sourceOf = (target: unknown): string | undefined => {
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

const entriesOf = (exports: unknown): [string, unknown][] => {
  if (typeof exports !== 'object' || exports === null) {
    return exports === undefined ? [] : [['.', exports]];
  }
  return Object.keys(exports).some((key) => key.startsWith('.'))
    ? Object.entries(exports)
    : [['.', exports]];
};

const baseNameOf = (path: string) => posix.basename(path).replace(/\.[cm]?tsx?$/, '');

/**
 * Returns each type that sits beside a file's function, class, or const and that files in three or
 * more folders import, as `<file> <type> (<count> folders)`. Such a type is shared, so it moves to
 * a file named after it, as typescript.md asks. It reads every package of the workspace at `root`,
 * and follows each package entry and each `export … from` back to the file that declares the type.
 *
 * @example
 * expect(sharedTypes(root)).toEqual([]);
 */
export function sharedTypes(root: string): string[] {
  const packages = workspacePackages(root);
  const entryFiles = new Map(
    packages.flatMap(({ folder, name, exports }) =>
      entriesOf(exports).flatMap(([entry, target]) => {
        const source = sourceOf(target);
        return source === undefined
          ? []
          : [[posix.join(name, entry), posix.join(folder, source)] as const];
      }),
    ),
  );
  const entryPaths = new Set(entryFiles.values());
  const sourceFiles = packages.flatMap(({ files }) =>
    files.filter(({ path }) => /\.[cm]?tsx?$/.test(path) && !path.endsWith('.d.ts')),
  );
  const exportsByFile = new Map(
    sourceFiles.map(({ path }) => [path, exportsOf(path, readFileSync(join(root, path), 'utf8'))]),
  );

  // The workspace file a specifier refers to, or `undefined` outside the workspace.
  const resolve = (importer: string, specifier: string) => {
    if (!specifier.startsWith('.')) {
      return entryFiles.get(specifier);
    }
    const path = posix.normalize(posix.join(posix.dirname(importer), specifier));
    const stem = path.replace(/\.[cm]?jsx?$/, '');
    return [path, `${stem}.ts`, `${stem}.tsx`, `${path}.ts`, `${path}/index.ts`].find(
      (candidate) => exportsByFile.has(candidate) || existsSync(join(root, candidate)),
    );
  };

  // The file that declares `name`, following each `export … from`.
  const declaringFile = (file: string, name: string, seen: Set<string>): string | undefined => {
    const found = exportsByFile.get(file);
    if (found === undefined || seen.has(file)) {
      return undefined;
    }
    seen.add(file);
    if (found.values.has(name) || found.types.has(name)) {
      return file;
    }
    for (const { name: exported, from, specifier } of found.reexports) {
      if (exported === name || exported === undefined) {
        const target = resolve(file, specifier);
        const declared =
          target === undefined
            ? undefined
            : declaringFile(target, from === '*' ? name : from, seen);
        if (declared !== undefined) {
          return declared;
        }
      }
    }
    return undefined;
  };

  const folders = new Map<string, Set<string>>();
  for (const { path, imports } of sourceFiles.filter(({ path }) => !entryPaths.has(path))) {
    for (const { specifier, names } of imports) {
      const target = resolve(path, specifier);
      for (const name of target === undefined ? [] : (names ?? [])) {
        const file = declaringFile(target ?? '', name, new Set());
        const declared = file === undefined ? undefined : exportsByFile.get(file);
        if (
          file === undefined ||
          declared === undefined ||
          declared.values.size === 0 ||
          !declared.types.has(name) ||
          declared.values.has(name) ||
          baseNameOf(file) === name
        ) {
          continue;
        }
        const key = `${file} ${name}`;
        folders.set(key, (folders.get(key) ?? new Set()).add(posix.dirname(path)));
      }
    }
  }
  return [...folders]
    .filter(([, importers]) => importers.size >= 3)
    .map(([key, importers]) => `${key} (${importers.size} folders)`);
}
