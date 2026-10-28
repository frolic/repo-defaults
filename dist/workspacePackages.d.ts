import { moduleImports } from './moduleImports.ts';
/**
 * Reads each package of the workspace at `root`: its folder, its manifest, and what each of its
 * source, style sheet, and tsconfig files imports. A style sheet imports with `@import`, `@plugin`,
 * or `@reference`, and a tsconfig with each name in `compilerOptions.types`. The root package
 * leaves out the folders of the other packages.
 *
 * @example
 * const packages = workspacePackages(root);
 */
export declare function workspacePackages(root: string): workspacePackages.ReturnType;
export declare namespace workspacePackages {
    type ReturnType = {
        /** The package's folder relative to the root, with `.` for the root. */
        folder: string;
        name: string;
        /** The `exports` field of its package.json, as written. */
        exports: unknown;
        scripts: string[];
        dependencies: string[];
        /** Each file relative to the root, with what it imports. */
        files: {
            path: string;
            imports: moduleImports.ReturnType;
        }[];
    }[];
}
