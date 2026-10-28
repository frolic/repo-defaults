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
export declare function unusedEntryNames(root: string, options?: unusedEntryNames.Options): string[];
export declare namespace unusedEntryNames {
    type Options = {
        /** Docs, besides each package's README, whose code spans name an export as used. */
        docs?: readonly string[] | undefined;
    };
}
