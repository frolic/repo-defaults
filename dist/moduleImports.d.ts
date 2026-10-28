/**
 * Returns what a TypeScript or JavaScript file takes from other modules: each specifier, with the
 * names the file takes from it. An import of the whole module, such as `import * as name` or
 * `import('name')`, gives `undefined` as its names, and so does `export * from`.
 *
 * @example
 * moduleImports('a.ts', "import { join } from 'node:path';"); // [{ specifier: 'node:path', names: ['join'] }]
 */
export declare function moduleImports(fileName: string, text: string): moduleImports.ReturnType;
export declare namespace moduleImports {
    type ReturnType = {
        specifier: string;
        names: string[] | undefined;
    }[];
}
