import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { unusedDependencies } from '../src/unusedDependencies.ts';
import { unusedEntryNames } from '../src/unusedEntryNames.ts';

const root = join(import.meta.dirname, '..');

const json = (value: object) => JSON.stringify(value);

// A workspace of two packages: the library core, and the app, which imports core. The library's
// dependencies are installed as stubs, in the folders where pnpm links them.
function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'workspace-'));
  const files = {
    'package.json': json({ name: 'acme', private: true }),
    'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
    'packages/core/package.json': json({
      name: '@acme/core',
      exports: { '.': './src/index.ts', './test': { src: './src/testing.ts' } },
      scripts: { build: 'tool build' },
      dependencies: { lines: '1.0.0', 'needs-host': '1.0.0', host: '1.0.0', unused: '1.0.0' },
      devDependencies: { '@types/lines': '1.0.0', tool: '1.0.0' },
    }),
    'packages/core/node_modules/lines/package.json': json({ name: 'lines' }),
    'packages/core/node_modules/needs-host/package.json': json({
      name: 'needs-host',
      peerDependencies: { host: '*' },
    }),
    'packages/core/node_modules/host/package.json': json({ name: 'host' }),
    'packages/core/node_modules/unused/package.json': json({ name: 'unused' }),
    'packages/core/node_modules/@types/lines/package.json': json({ name: '@types/lines' }),
    'packages/core/node_modules/tool/package.json': json({ name: 'tool', bin: { tool: 'x.js' } }),
    'packages/core/README.md': 'Call `documented()` to read the docs.\n',
    'packages/core/src/index.ts': [
      "import { split } from 'lines';",
      "import 'needs-host';",
      'export type Options = { size: number };',
      'export function read(options: Options) { return split(options); }',
      'export function documented() {}',
      'export function unusedThing() {}',
      'export const helper = 1;',
    ].join('\n'),
    'packages/core/src/testing.ts': 'export function fake() {}\nexport function unusedFake() {}\n',
    'packages/app/package.json': json({
      name: 'app',
      dependencies: { '@acme/core': 'workspace:*' },
    }),
    'packages/app/src/main.ts': [
      "import { read } from '@acme/core';",
      "import { unusedFake } from '@acme/core/test';",
    ].join('\n'),
    'packages/app/src/main.test.ts': "import { fake } from '@acme/core/test';\n",
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

test('lists only dependencies that a package imports, runs, or that another dependency needs', () => {
  expect(unusedDependencies(workspace())).toEqual(['packages/core: unused']);
});

test('repo-defaults lists only dependencies it uses', () => {
  expect(unusedDependencies(root)).toEqual([]);
}, 60_000);

test('an entry exports only names that another package, its README, or its own API uses', () => {
  expect(unusedEntryNames(workspace()).toSorted()).toEqual([
    '@acme/core/test: unusedFake',
    '@acme/core: helper',
    '@acme/core: unusedThing',
  ]);
}, 60_000);

test('a doc passed in counts its code spans as uses', () => {
  const dir = workspace();
  writeFileSync(join(dir, 'client.md'), 'Read `helper` and `unusedThing`.\n');
  expect(unusedEntryNames(dir, { docs: [join(dir, 'client.md')] })).toEqual([
    '@acme/core/test: unusedFake',
  ]);
}, 60_000);
