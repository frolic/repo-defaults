import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';

const root = join(import.meta.dirname, '..');

function host() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'host-')));
  execFileSync('git', ['init', '--quiet'], { cwd: dir });
  symlinkSync(root, join(dir, 'repo-defaults'));
  return dir;
}

const init = (cwd: string) =>
  execFileSync(process.execPath, [join(root, 'src/init.ts')], { cwd, encoding: 'utf8' });

const read = (dir: string, path: string) => readFileSync(join(dir, path), 'utf8');

test('sets up an empty repo and changes nothing on a second run', () => {
  const dir = host();
  init(dir);
  const files = ['CLAUDE.md', 'AGENTS.md', 'tsconfig.json', '.git/hooks/commit-msg'];
  const first = files.map((path) => read(dir, path));
  init(dir);

  expect(files.map((path) => read(dir, path))).toEqual(first);
  expect(read(dir, 'CLAUDE.md')).toBe(
    '@AGENTS.md\n@repo-defaults/writing.md\n@repo-defaults/typescript.md\n@repo-defaults/principles.md\n@repo-defaults/workflow.md\n',
  );
  expect(read(dir, 'AGENTS.md')).toContain('Follow the rules in repo-defaults/writing.md,');
  expect(JSON.parse(read(dir, 'tsconfig.json'))).toEqual({
    extends: './repo-defaults/tsconfig/strict.json',
  });
  expect(read(dir, '.git/hooks/commit-msg')).toContain('repo-defaults/src/commitMessage.ts');
  expect(existsSync(join(dir, '.claude/skills/pr-review/SKILL.md'))).toBe(true);
});

test('adds to existing files and leaves an existing hook alone', () => {
  const dir = host();
  writeFileSync(join(dir, 'AGENTS.md'), '# Guide\n\nUse tabs.\n');
  writeFileSync(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
  writeFileSync(join(dir, 'tsconfig.json'), '{}\n');
  writeFileSync(join(dir, '.git/hooks/commit-msg'), '#!/bin/sh\nexit 0\n');
  const output = init(dir);

  expect(
    read(dir, 'CLAUDE.md')
      .split('\n')
      .filter((line) => line === '@AGENTS.md'),
  ).toHaveLength(1);
  expect(read(dir, 'AGENTS.md')).toMatch(/^# Guide\n\nFollow the rules in .*\n\nUse tabs\.\n$/);
  expect(read(dir, 'tsconfig.json')).toBe('{}\n');
  expect(read(dir, '.git/hooks/commit-msg')).toBe('#!/bin/sh\nexit 0\n');
  expect(output).toContain('tsconfig.json: extend ./repo-defaults/tsconfig/strict.json');
  expect(output).toContain('commit-msg hook: .git/hooks/commit-msg exists');
});

test('refuses to run before repo-defaults is added', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'host-')));
  expect(() =>
    execFileSync(process.execPath, [join(root, 'src/init.ts')], { cwd: dir, stdio: 'pipe' }),
  ).toThrow(/Add repo-defaults first/);
});
