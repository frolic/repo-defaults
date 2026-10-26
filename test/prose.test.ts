import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import {
  check,
  countWords,
  findCodePackageName,
  findMadeUpActor,
  findMissingSerialComma,
  findRuledOutWord,
  walk,
} from '../src/prose.ts';

const root = join(import.meta.dirname, '..');

// writing.md quotes the patterns it rules out in the first column of its table, and lists the
// ruled-out words in its rules.
test('the prose in this repo follows writing.md', () => {
  const writing = join(root, 'writing.md');
  // prose.ts and this file quote the patterns in code and in their tests.
  const files = walk(root, {
    skip: [join(root, 'vendor'), join(root, 'src/prose.ts'), join(root, 'test/prose.test.ts')],
  });
  expect(check(files, { root, tables: [writing], skip: { 'ruled-out-word': [writing] } })).toEqual(
    [],
  );
});

test('check reports each rule with its file and line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-'));
  const file = join(dir, 'notes.md');
  writeFileSync(
    file,
    [
      'An app that supports older browsers adds its own.',
      'It reads `a`, `b` and `c`.',
      'The cache absorbs the reads.',
      'Install `@scope/lines` first.',
      '```',
      'It reads a, b and c.',
      '```',
      '| A caller who waits, b and c | Write this |',
    ].join('\n'),
  );
  expect(check([file], { root: dir })).toEqual([
    { file: 'notes.md', line: 1, rule: 'made-up-actor', text: 'An app that ' },
    { file: 'notes.md', line: 8, rule: 'made-up-actor', text: 'A caller who ' },
    { file: 'notes.md', line: 2, rule: 'serial-comma', text: 'It reads `a`, `b` and `c`' },
    { file: 'notes.md', line: 3, rule: 'ruled-out-word', text: 'absorbs' },
    { file: 'notes.md', line: 4, rule: 'code-package-name', text: '`@scope/lines`' },
    { file: 'notes.md', line: 8, rule: 'serial-comma', text: 'caller who waits, b and c' },
  ]);
  expect(check([file], { root: dir, tables: [file], skip: { 'ruled-out-word': [file] } })).toEqual([
    { file: 'notes.md', line: 1, rule: 'made-up-actor', text: 'An app that ' },
    { file: 'notes.md', line: 2, rule: 'serial-comma', text: 'It reads `a`, `b` and `c`' },
    { file: 'notes.md', line: 4, rule: 'code-package-name', text: '`@scope/lines`' },
  ]);
});

test('countWords counts the runs of text between whitespace', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'words-')), 'doc.md');
  writeFileSync(file, '# Title\n\nTwo  words.\n');
  expect(countWords(file)).toBe(4);
});

test('findMadeUpActor finds an app, caller, or user that acts', () => {
  expect(findMadeUpActor('A caller who wants a few tries writes a counter.')).toBe('A caller who ');
  expect(findMadeUpActor('If you support older browsers, add them yourself.')).toBeUndefined();
  expect(findMadeUpActor('Never write "an app that adds its own".')).toBeUndefined();
});

test('findCodePackageName finds package names and skips subpaths', () => {
  expect(findCodePackageName('Errors extend the classes in `@acme/errors`.')).toBe(
    '`@acme/errors`',
  );
  expect(findCodePackageName('It takes `@noble/hashes` as a peer.')).toBe('`@noble/hashes`');
  expect(findCodePackageName("Pass the `ws` package's class.")).toBe('`ws` package');
  expect(findCodePackageName('- [`lines`](/packages/lines) splits bytes.')).toBe(
    '[`lines`](/packages/lines',
  );
  expect(findCodePackageName('Import `@acme/streams/node` in Node.')).toBeUndefined();
  expect(findCodePackageName('The [`Spf.check`](../spf/README.md) result.')).toBeUndefined();
  expect(findCodePackageName('Never write "`@acme/errors`".')).toBeUndefined();
  expect(findCodePackageName('Errors extend the classes in @acme/errors.')).toBeUndefined();
});

test('findRuledOutWord skips code spans and quotations', () => {
  expect(findRuledOutWord('The cache absorbs the burst of reads.')).toBe('absorbs');
  expect(findRuledOutWord('It stops — and then waits.')).toBe('—');
  expect(findRuledOutWord('A crucial step.')).toBe('crucial');
  expect(findRuledOutWord('Never write "lands" or `seam`.')).toBeUndefined();
  expect(findRuledOutWord('The landscape of islands.')).toBeUndefined();
});

test('findMissingSerialComma finds lists and skips clauses', () => {
  expect(findMissingSerialComma('`fetch`, `Request` and `Response` are global.')).toBe(
    '`fetch`, `Request` and `Response`',
  );
  expect(findMissingSerialComma('A row ends at CRLF, LF or CR.')).toBe('ends at CRLF, LF or CR.');
  expect(findMissingSerialComma('A row ends at CRLF, LF, or CR.')).toBeUndefined();
  expect(findMissingSerialComma('It rejects "a, b and c" as written.')).toBeUndefined();
  expect(findMissingSerialComma('Use `f(a, b)` and `g`.')).toBeUndefined();
  expect(findMissingSerialComma('When it aborts, `encode` and `decode` reject.')).toBeUndefined();
  expect(findMissingSerialComma('`exports`, whether or not it has one.')).toBeUndefined();
  expect(
    findMissingSerialComma('Names are signed, sorted by name and then value.'),
  ).toBeUndefined();
});
