import { readFileSync } from 'node:fs';

const columns = ['Correction', 'Seen', 'Enforced by'];

const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

/**
 * Returns each row of a corrections log, such as `.claude/corrections.md`, that was seen twice or
 * more but names no check in its `Enforced by` column: an empty cell, or one that starts with
 * "nothing", as in "nothing yet". A test of the log fails until each repeated correction has a
 * check, as workflow.md asks. The log is a Markdown table with `Correction`, `Seen`, and `Enforced
 * by` columns, as in `templates/claude/corrections.md`. Throws a `TypeError` if the file has no
 * such table.
 *
 * @example
 * expect(unenforcedCorrections(join(root, '.claude/corrections.md'))).toEqual([]);
 */
export function unenforcedCorrections(file: string): unenforcedCorrections.ReturnType {
  const lines = readFileSync(file, 'utf8').split('\n');
  const header = lines.findIndex(
    (line) => line.trim().startsWith('|') && columns.every((name) => cellsOf(line).includes(name)),
  );
  if (header === -1) {
    throw new TypeError(`${file} has no table with Correction, Seen, and Enforced by columns.`);
  }
  const [correction, seen, enforcedBy] = columns.map((name) =>
    cellsOf(lines[header] ?? '').indexOf(name),
  );
  const found: unenforcedCorrections.ReturnType = [];
  for (let index = header + 2; lines[index]?.trim().startsWith('|'); index++) {
    const cells = cellsOf(lines[index] ?? '');
    const count = Number(cells[seen ?? -1]);
    const check = cells[enforcedBy ?? -1] ?? '';
    if (count >= 2 && (check === '' || /^nothing\b/i.test(check))) {
      found.push({ line: index + 1, correction: cells[correction ?? -1] ?? '', seen: count });
    }
  }
  return found;
}

export declare namespace unenforcedCorrections {
  type ReturnType = { line: number; correction: string; seen: number }[];
}
