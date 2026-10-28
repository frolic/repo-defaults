import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { minimumReleaseAge } from '../src/minimumReleaseAge.ts';
import { versionRanges } from '../src/versionRanges.ts';
import { workspaceFolders } from '../src/workspaceFolders.ts';

const root = join(import.meta.dirname, '..');

const repo = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), 'workspace-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
};

const manifest = (fields: object) => JSON.stringify({ name: 'x', ...fields });

test('workspaceFolders lists the root and each package of pnpm-workspace.yaml or workspaces', () => {
  const pnpm = repo({
    'package.json': manifest({}),
    'pnpm-workspace.yaml': "packages:\n  - packages/*\n  - 'apps/*'\n\ncatalog:\n  a: 1.0.0\n",
    'packages/sdk/package.json': manifest({}),
    'packages/notes/README.md': '',
    'apps/chat/package.json': manifest({}),
  });
  expect(workspaceFolders(pnpm)).toEqual(['.', 'apps/chat', 'packages/sdk']);
  const npm = repo({
    'package.json': manifest({ workspaces: ['packages/*'] }),
    'packages/sdk/package.json': manifest({}),
  });
  expect(workspaceFolders(npm)).toEqual(['.', 'packages/sdk']);
});

test('pins each dependency and catalog entry to an exact version, and leaves only a peer a range', () => {
  const dir = repo({
    'package.json': manifest({
      devDependencies: { typescript: '^6.0.3', oxlint: '1.88.0', defaults: 'github:acme/defaults' },
    }),
    'pnpm-workspace.yaml': [
      'packages:',
      '  - packages/*',
      'catalog:',
      '  effect: 4.0.2',
      "  vitest: '~5.0.0'",
      'catalogs:',
      '  react18:',
      '    react: ^18.3.1',
      'minimumReleaseAge: 20160',
    ].join('\n'),
    'packages/sdk/package.json': manifest({
      dependencies: { effect: 'catalog:', rows: 'workspace:*', lines: '>=1' },
      peerDependencies: { typescript: '>=6' },
    }),
  });
  expect(versionRanges(dir)).toEqual([
    'package.json devDependencies: typescript ^6.0.3',
    'packages/sdk/package.json dependencies: lines >=1',
    'pnpm-workspace.yaml catalog: vitest ~5.0.0',
    'pnpm-workspace.yaml catalog: react ^18.3.1',
  ]);
});

test('repo-defaults pins each of its own dependencies', () => {
  expect(versionRanges(root)).toEqual([]);
});

test('minimumReleaseAge reads pnpm-workspace.yaml, then .npmrc', () => {
  expect(minimumReleaseAge(repo({ 'pnpm-workspace.yaml': 'minimumReleaseAge: 20160\n' }))).toBe(
    20160,
  );
  expect(minimumReleaseAge(repo({ '.npmrc': 'minimum-release-age=1440\n' }))).toBe(1440);
  expect(minimumReleaseAge(repo({ 'pnpm-workspace.yaml': 'packages:\n  - a\n' }))).toBeUndefined();
});

test('the pnpm-workspace.yaml template refuses releases younger than 14 days', () => {
  expect(minimumReleaseAge(join(root, 'templates/pnpm'))).toBe(14 * 24 * 60);
});
