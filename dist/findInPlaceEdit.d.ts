/**
 * Returns how a shell command edits files in place, such as `sed -i`, or `undefined` if it doesn't.
 * A Python, Node, Deno, or Bun script counts when it writes, renames, or opens a file for writing,
 * but not when it only writes to stdout or stderr.
 *
 * @example
 * findInPlaceEdit("sed -i 's/a/b/' notes.md"); // 'sed -i'
 */
export declare function findInPlaceEdit(command: string): string | undefined;
