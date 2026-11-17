import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
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
  expect(existsSync(join(dir, '.agents/skills/unslop/SKILL.md'))).toBe(true);
  expect(existsSync(join(dir, '.claude/agents/comment-sicko.md'))).toBe(true);
  expect(existsSync(join(dir, '.claude/skills/tdd/SKILL.md'))).toBe(false);
  expect(existsSync(join(dir, '.claude/skills/grill-me'))).toBe(false);
});

test('an agent can choose a skill that only a slash command could run', () => {
  const dir = host();
  run(dir);
  const skill = join(dir, '.claude/skills/poteto-mode');
  run(dir, 'poteto-mode');

  const source = readFileSync(join(root, 'vendor/pstack/skills/poteto-mode/SKILL.md'), 'utf8');
  expect(source).toMatch(/^disable-model-invocation: true$/m);
  expect(readFileSync(join(skill, 'SKILL.md'), 'utf8')).toBe(
    source.replace('disable-model-invocation: true\n', ''),
  );
  expect(lstatSync(join(skill, 'playbooks')).isSymbolicLink()).toBe(true);
  expect(readlinkSync(join(skill, 'playbooks'))).not.toMatch(/^\//);
  expect(existsSync(join(skill, 'playbooks/bug-fix.md'))).toBe(true);
  // The written folder sits under .agents/, which the format settings ignore.
  expect(readlinkSync(skill)).toBe('../../.agents/skills/poteto-mode');
  expect(lstatSync(join(dir, '.agents/skills/poteto-mode')).isDirectory()).toBe(true);
});

test('deletes the .claude link when its written folder is gone', () => {
  const dir = host();
  run(dir, 'poteto-mode');
  rmSync(join(dir, '.agents/skills/poteto-mode'), { recursive: true });
  run(dir);
  expect(lstatSync(join(dir, '.claude/skills/poteto-mode'), { throwIfNoEntry: false })).toBe(
    undefined,
  );
});

test('deletes a link into repo-defaults whose skill is gone', () => {
  const dir = host();
  mkdirSync(join(dir, '.claude/skills'), { recursive: true });
  symlinkSync(join(root, 'skills/removed'), join(dir, '.claude/skills/removed'));
  symlinkSync('/elsewhere/kept', join(dir, '.claude/skills/kept'));
  run(dir);
  expect(lstatSync(join(dir, '.claude/skills/removed'), { throwIfNoEntry: false })).toBe(undefined);
  expect(lstatSync(join(dir, '.claude/skills/kept')).isSymbolicLink()).toBe(true);
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
