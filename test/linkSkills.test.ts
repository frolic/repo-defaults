import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vite-plus/test';

const root = join(import.meta.dirname, '..');
const script = join(root, 'src/linkSkills.ts');

const run = (cwd: string, ...args: string[]) =>
  execFileSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });

const host = () => realpathSync(mkdtempSync(join(tmpdir(), 'host-')));

test('links skills/, the vendor.json lists, and keeps the repo own copies', () => {
  const dir = host();
  mkdirSync(join(dir, '.claude/skills/tdd'), { recursive: true });
  run(dir);
  run(dir);

  const link = join(dir, '.claude/skills/prose-review');
  expect(resolve(join(dir, '.claude/skills'), readlinkSync(link))).toBe(
    join(root, 'skills/prose-review'),
  );
  const unslop = readlinkSync(join(dir, '.agents/skills/unslop'));
  expect(unslop).not.toMatch(/^\//);
  expect(resolve(join(dir, '.agents/skills'), unslop)).toBe(
    join(root, 'vendor/pstack/skills/unslop'),
  );
  expect(existsSync(join(dir, '.claude/skills/unslop/SKILL.md'))).toBe(true);
  expect(existsSync(join(dir, '.claude/agents/comment-sicko.md'))).toBe(true);
  expect(existsSync(join(dir, '.claude/skills/tdd/SKILL.md'))).toBe(false);
  expect(existsSync(join(dir, '.claude/skills/grill-me'))).toBe(false);
});

test('links the vendored skills named on the command line', () => {
  const dir = host();
  run(dir, 'grill-me', 'humanlayer-skills/rpi');
  expect(existsSync(join(dir, '.claude/skills/grill-me/SKILL.md'))).toBe(true);
  expect(existsSync(join(dir, '.agents/skills/rpi/SKILL.md'))).toBe(true);
});

test('rejects a skill name that two sources share or that none has', () => {
  expect(() => run(host(), 'teach')).toThrow(/mattpocock-skills\/teach, pstack\/teach/);
  expect(() => run(host(), 'mattpocock-skills/tdd')).toThrow(/Two skills are named tdd/);
  expect(() => run(host(), 'missing')).toThrow(/No vendored skill is named missing/);
});

test('--list prints every vendored skill', () => {
  const list = run(host(), '--list');
  expect(list).toContain('pstack/unslop');
  expect(list).toContain('mattpocock-skills/grill-me');
  expect(list).toContain('humanlayer-skills/rpi');
});
