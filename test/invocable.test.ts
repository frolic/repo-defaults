import { lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { writeInvocable } from '../scripts/invocable.ts';

const root = join(import.meta.dirname, '..');
const vendor = join(root, 'vendor');

// Each file under `dir` with its text, or, for a link, the file in vendor/ it points to.
function read(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (path: string) => {
    for (const entry of readdirSync(path).toSorted()) {
      const child = join(path, entry);
      const stat = lstatSync(child);
      if (stat.isSymbolicLink()) {
        files[relative(dir, child)] =
          `-> ${relative(vendor, resolve(dirname(child), readlinkSync(child)))}`;
      } else if (stat.isDirectory()) {
        walk(child);
      } else {
        files[relative(dir, child)] = readFileSync(child, 'utf8');
      }
    }
  };
  walk(dir);
  return files;
}

test('invocable matches a fresh copy of vendor', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'invocable-')), 'invocable');
  writeInvocable(vendor, out);
  expect(read(join(root, 'invocable'))).toEqual(read(out));
});

test('a copy drops only the slash-command flag and links the rest of the skill', () => {
  const architect = 'pstack/skills/architect';
  const copy = readFileSync(join(root, 'invocable', architect, 'SKILL.md'), 'utf8');
  const source = readFileSync(join(vendor, architect, 'SKILL.md'), 'utf8');
  expect(source).toMatch(/^disable-model-invocation: true$/m);
  expect(copy).toBe(source.replace('disable-model-invocation: true\n', ''));

  const link = join(root, 'invocable/pstack/skills/poteto-mode/playbooks');
  expect(readlinkSync(link)).toBe('../../../../vendor/pstack/skills/poteto-mode/playbooks');
});
