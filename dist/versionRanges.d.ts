/**
 * Returns each dependency in the workspace at `root` that names a range, such as `^4.1.0` or
 * `~5.9.3`, instead of an exact version, as `<file> <section>: <name> <range>`. It reads the
 * `dependencies`, `devDependencies`, and `optionalDependencies` of every package.json in the
 * workspace, and the catalogs of pnpm-workspace.yaml. A peer dependency stays a range, because it
 * says what the package works with. `catalog:`, `workspace:*`, and a git or local dependency count
 * as exact, because only an update changes what they install.
 *
 * @example
 * expect(versionRanges(root)).toEqual([]);
 */
export declare function versionRanges(root: string): string[];
