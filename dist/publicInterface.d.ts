import ts from 'typescript';
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
export declare function publicInterface(entries: readonly publicInterface.Entry[], options?: publicInterface.Options): string;
export declare namespace publicInterface {
    type Entry = {
        /** The specifier that other code imports, such as `lines` or `lines/node`. */
        specifier: string;
        /** The absolute path of the entry's TypeScript file. */
        path: string;
    };
    type Options = {
        /** Compiler options to use instead of the defaults, such as `lib` or `types`. */
        compilerOptions?: ts.CompilerOptions | undefined;
    };
}
