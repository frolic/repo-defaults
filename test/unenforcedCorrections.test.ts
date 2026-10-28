import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { unenforcedCorrections } from '../src/unenforcedCorrections.ts';

const root = join(import.meta.dirname, '..');

const log = (text: string) => {
  const file = join(mkdtempSync(join(tmpdir(), 'corrections-')), 'corrections.md');
  writeFileSync(file, text);
  return file;
};

test('a correction seen twice names the check that enforces it', () => {
  const file = log(
    [
      '# Corrections',
      '',
      '| Correction | Seen | Last | Enforced by |',
      '| --- | --- | --- | --- |',
      '| Edit files with the Edit tool | 3 | 2026-10-27 | `refuseInPlaceEdits` |',
      '| Ask before adding a public name | 2 | 2026-10-27 |  |',
      '| Explain each option in plain words | 2 | 2026-10-28 | nothing yet |',
      '| Close a question only with the owner words | 1 | 2026-10-27 | nothing yet |',
      '| A rule another party relies on is checked where they trust it | 2 | 2026-10-27 | review |',
      '',
      'A paragraph after the table.',
    ].join('\n'),
  );
  expect(unenforcedCorrections(file)).toEqual([
    { line: 6, correction: 'Ask before adding a public name', seen: 2 },
    { line: 7, correction: 'Explain each option in plain words', seen: 2 },
  ]);
});

test('the corrections template is a log with no rows', () => {
  expect(unenforcedCorrections(join(root, 'templates/claude/corrections.md'))).toEqual([]);
});

test('a file without the log table is refused', () => {
  expect(() => unenforcedCorrections(log('# Notes\n'))).toThrow(/no table/);
});
