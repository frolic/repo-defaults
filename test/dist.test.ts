import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';

const root = join(import.meta.dirname, '..');

const read = (dir: string) =>
  Object.fromEntries(
    readdirSync(dir)
      .toSorted()
      .map((name) => [name, readFileSync(join(dir, name), 'utf8')]),
  );

// A git dependency installs the committed dist/, so it has to match the source.
test('dist matches a fresh build of src', () => {
  const out = mkdtempSync(join(tmpdir(), 'dist-'));
  execFileSync(
    process.execPath,
    [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.build.json', '--outDir', out],
    { cwd: root },
  );
  expect(read(join(root, 'dist'))).toEqual(read(out));
}, 60_000);
