/**
 * Returns each type that sits beside a file's function, class, or const and that files in three or
 * more folders import, as `<file> <type> (<count> folders)`. Such a type is shared, so it moves to
 * a file named after it, as typescript.md asks. It reads every package of the workspace at `root`,
 * and follows each package entry and each `export … from` back to the file that declares the type.
 *
 * @example
 * expect(sharedTypes(root)).toEqual([]);
 */
export declare function sharedTypes(root: string): string[];
