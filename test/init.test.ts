import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
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

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: 'pipe' }).trim();

function host() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'host-')));
  git(dir, 'init', '--quiet');
  symlinkSync(root, join(dir, 'repo-defaults'));
  return dir;
}

function linkedWorktree(dir: string) {
  git(dir, 'commit', '--quiet', '--allow-empty', '-m', 'Start');
  const worktree = join(realpathSync(mkdtempSync(join(tmpdir(), 'worktree-'))), 'host');
  git(dir, 'worktree', 'add', '--quiet', worktree);
  symlinkSync(root, join(worktree, 'repo-defaults'));
  return worktree;
}

const init = (cwd: string) =>
  execFileSync(process.execPath, [join(root, 'src/init.ts')], { cwd, encoding: 'utf8' });

const read = (dir: string, path: string) => readFileSync(join(dir, path), 'utf8');

test('sets up an empty repo and changes nothing on a second run', () => {
  const dir = host();
  init(dir);
  const files = ['CLAUDE.md', 'AGENTS.md', 'tsconfig.json', '.claude/settings.json'];
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
  expect(git(dir, 'config', 'core.hooksPath')).toBe('repo-defaults/hooks');
  expect(read(dir, '.claude/settings.json')).toContain('Bash(gh workflow run:*)');
  expect(existsSync(join(dir, '.claude/skills/pr-review/SKILL.md'))).toBe(true);
});

test('adds to existing files and leaves the repo own hooks and settings alone', () => {
  const dir = host();
  writeFileSync(join(dir, 'AGENTS.md'), '# Guide\n\nUse tabs.\n');
  writeFileSync(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
  writeFileSync(join(dir, 'tsconfig.json'), '{}\n');
  writeFileSync(join(dir, 'package.json'), '{ "scripts": { "test": "vitest" } }\n');
  writeFileSync(join(dir, '.git/hooks/commit-msg'), '#!/bin/sh\nexit 0\n');
  const output = init(dir);

  expect(
    read(dir, 'CLAUDE.md')
      .split('\n')
      .filter((line) => line === '@AGENTS.md'),
  ).toHaveLength(1);
  expect(read(dir, 'AGENTS.md')).toMatch(/^# Guide\n\nFollow the rules in .*\n\nUse tabs\.\n$/);
  expect(read(dir, 'tsconfig.json')).toBe('{}\n');
  expect(JSON.parse(read(dir, 'package.json')).scripts).toEqual({
    test: 'vitest',
    prepare: 'git config core.hooksPath repo-defaults/hooks',
  });
  expect(() => git(dir, 'config', 'core.hooksPath')).toThrow(/Command failed/);
  expect(output).toContain('tsconfig.json: extend ./repo-defaults/tsconfig/strict.json');
  expect(output).toContain('git hooks: .git/hooks has commit-msg');
  expect(output).toContain('add the check:staged, check, test:changed, test:full scripts');
});

test('the hooks run the repo scripts and reject a bad commit message', () => {
  const dir = host();
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      scripts: { 'check:staged': "node -e \"require('fs').writeFileSync('staged.txt', '')\"" },
    }),
  );
  init(dir);
  git(dir, 'add', 'package.json');
  git(dir, 'commit', '--quiet', '-m', 'Add the package');
  expect(existsSync(join(dir, 'staged.txt'))).toBe(true);

  expect(() =>
    git(
      dir,
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      ['An app', 'that waits adds it'].join(' '),
    ),
  ).toThrow(/made-up actor/);
});

// A linked worktree shares .git/config with the main one, so core.hooksPath set there would point
// every worktree at repo-defaults/hooks, including those whose branch doesn't have it.
test('leaves the shared git config alone when run from a linked worktree', () => {
  const dir = host();
  const worktree = linkedWorktree(dir);
  const output = init(worktree);

  expect(() => git(dir, 'config', 'core.hooksPath')).toThrow(/Command failed/);
  expect(output).toContain('git hooks: this is a linked worktree');

  git(dir, 'config', 'extensions.worktreeConfig', 'true');
  init(worktree);
  expect(git(worktree, 'config', 'core.hooksPath')).toBe('repo-defaults/hooks');
  expect(() => git(dir, 'config', 'core.hooksPath')).toThrow(/Command failed/);
});

test('finds the repo own hooks from a linked worktree', () => {
  const dir = host();
  git(dir, 'config', 'extensions.worktreeConfig', 'true');
  writeFileSync(join(dir, '.git/hooks/commit-msg'), '#!/bin/sh\nexit 0\n');
  const output = init(linkedWorktree(dir));

  expect(() => git(dir, 'config', 'core.hooksPath')).toThrow(/Command failed/);
  expect(output).toContain(`git hooks: ${join(dir, '.git/hooks')} has commit-msg`);
});

// git can't stash a tree where a deleted file sits under a new link ("beyond a symbolic link"), so
// lint-staged's backup fails unless the hook passes --no-stash.
test('the pre-commit hook passes a commit that replaces a folder with a link', () => {
  const dir = host();
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ scripts: { 'check:staged': 'vp staged' } }),
  );
  writeFileSync(join(dir, 'vite.config.ts'), "export default { staged: { '*': 'true' } };\n");
  mkdirSync(join(dir, 'skill'));
  mkdirSync(join(dir, 'shared'));
  writeFileSync(join(dir, 'skill/SKILL.md'), 'Own copy\n');
  writeFileSync(join(dir, 'shared/SKILL.md'), 'Shared copy\n');
  init(dir);
  const commit = (message: string) =>
    execFileSync('git', ['commit', '--quiet', '-m', message], {
      cwd: dir,
      env: { ...env, PATH: `${join(root, 'node_modules/.bin')}:${process.env['PATH']}` },
      stdio: 'pipe',
    });
  git(dir, 'add', 'package.json', 'vite.config.ts', 'skill', 'shared');
  commit('Add the skill');

  git(dir, 'rm', '-r', '--quiet', 'skill');
  symlinkSync('shared', join(dir, 'skill'));
  writeFileSync(join(dir, 'shared/SKILL.md'), 'Shared copy, edited\n');
  git(dir, 'add', 'skill', 'shared');
  commit('Link the shared skill');

  expect(git(dir, 'ls-tree', 'HEAD', 'skill')).toMatch(/^120000 blob /);
});

test('refuses to run before repo-defaults is added', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'host-')));
  expect(() =>
    execFileSync(process.execPath, [join(root, 'src/init.ts')], { cwd: dir, stdio: 'pipe' }),
  ).toThrow(/Add repo-defaults first/);
});
