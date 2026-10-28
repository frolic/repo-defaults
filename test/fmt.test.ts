import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { fmt } from '../src/oxc.ts';

const root = join(import.meta.dirname, '..');

// Runs oxfmt with the shared settings on the given files in a new folder, and returns them.
function format(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'fmt-'));
  writeFileSync(join(dir, '.oxfmtrc.json'), JSON.stringify(fmt));
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text);
  }
  execFileSync(
    join(root, 'node_modules/.bin/oxfmt'),
    ['-c', '.oxfmtrc.json', ...Object.keys(files)],
    { cwd: dir },
  );
  return Object.fromEntries(
    Object.keys(files).map((name) => [name, readFileSync(join(dir, name), 'utf8')]),
  );
}

test('formats package.json and keeps each key on its side of the zile marker', () => {
  const { 'package.json': formatted = '' } = format({
    'package.json': [
      '{',
      '  "scripts": {"test": "vitest", "build": "zile build"},',
      '  "devDependencies": {"typescript": "6.0.3", "@types/node": "26.6.5"},',
      '  "[!start-pkg]": "",',
      '  "name": "lines", "version": "0.0.0", "type": "module",',
      '  "dependencies": {"streams": "1.0.0"}',
      '}',
    ].join('\n'),
  });
  expect(Object.keys(JSON.parse(formatted))).toEqual([
    'scripts',
    'devDependencies',
    '[!start-pkg]',
    'name',
    'version',
    'type',
    'dependencies',
  ]);
  expect(formatted).toContain('  "scripts": {\n    "test": "vitest",\n');
});

test('formats Markdown', () => {
  const { 'README.md': formatted } = format({
    'README.md': '# Title\n\n* one\n* two\n\n| a | b |\n|-|-|\n| long cell | c |\n',
  });
  expect(formatted).toBe(
    '# Title\n\n- one\n- two\n\n| a         | b   |\n| --------- | --- |\n| long cell | c   |\n',
  );
});
