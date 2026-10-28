/**
 * Returns each dependency that a package of the workspace at `root` lists but doesn't use, as
 * `<folder>: <name>`. A dependency is used when a file of the package imports it, also from a
 * style sheet's `@import` or a tsconfig's `types`; when a script of the package runs a command from
 * its `bin`; or when another dependency of the package needs it as a peer. The DefinitelyTyped package
 * of a dependency counts as used when the package imports that dependency. Install the dependencies first, because commands and peers
 * come from each installed package.json.
 *
 * @example
 * expect(unusedDependencies(root)).toEqual([]);
 */
export declare function unusedDependencies(root: string): string[];
