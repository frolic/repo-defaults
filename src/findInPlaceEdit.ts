const edits = [
  { pattern: /(?:^|[\s|;&(])sed\b[^|;&\n]*\s(?:-[a-zA-Z]*i|--in-place)\b/, name: 'sed -i' },
  { pattern: /(?:^|[\s|;&(])(?:perl|ruby)\b[^|;&\n]*\s-[a-zA-Z]*i/, name: 'perl -i or ruby -i' },
  {
    pattern:
      /\b(?:python3?|node|deno|bun)\b[\s\S]*(?:(?<!std(?:out|err))\.write(?:_text|_bytes)?\(|\bopen\([^)]*,\s*(?:mode\s*=\s*)?["'][^"']*[wax+]|writeFile(?:Sync)?\(|appendFile(?:Sync)?\(|\bos\.(?:replace|rename)\(|\bshutil\.)/,
    name: 'a python or node script that writes files',
  },
];

/**
 * Returns how a shell command edits files in place, such as `sed -i`, or `undefined` if it doesn't.
 * A Python, Node, Deno, or Bun script counts when it writes, renames, or opens a file for writing,
 * but not when it only writes to stdout or stderr.
 *
 * @example
 * findInPlaceEdit("sed -i 's/a/b/' notes.md"); // 'sed -i'
 */
export function findInPlaceEdit(command: string): string | undefined {
  return edits.find(({ pattern }) => pattern.test(command))?.name;
}
