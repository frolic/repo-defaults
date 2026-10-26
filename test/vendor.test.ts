import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';

const script = join(import.meta.dirname, '../scripts/vendor.ts');

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env,
  }).trim();

function repo(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'repo-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  commit(dir, files);
  return dir;
}

function commit(dir: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '--quiet', '-m', 'Change');
  return git(dir, 'rev-parse', 'HEAD');
}

const vendor = (cwd: string, ...args: string[]) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd,
    env,
    stdio: 'pipe',
  });

test('add vendors a directory of a repo, and update pulls its newest commit', () => {
  const upstream = repo({ 'pack/skills/a/SKILL.md': 'one', 'other.md': 'left out' });
  const host = repo({ 'vendor.json': '{}\n' });

  vendor(host, 'add', 'pack', upstream, '--path', 'pack');
  expect(readFileSync(join(host, 'vendor/pack/skills/a/SKILL.md'), 'utf8')).toBe('one');
  expect(() => readFileSync(join(host, 'vendor/pack/other.md'))).toThrow(/ENOENT/);

  const latest = commit(upstream, { 'pack/skills/a/SKILL.md': 'two' });
  vendor(host, 'update');
  expect(readFileSync(join(host, 'vendor/pack/skills/a/SKILL.md'), 'utf8')).toBe('two');
  const manifest = JSON.parse(readFileSync(join(host, 'vendor.json'), 'utf8'));
  expect(manifest.pack.commit).toBe(latest);
  expect(git(host, 'status', '--porcelain')).toBe('');
}, 60_000);

test('update refuses to run with uncommitted changes', () => {
  const host = repo({ 'vendor.json': '{}\n' });
  writeFileSync(join(host, 'notes.md'), 'draft');
  expect(() => vendor(host, 'update')).toThrow(/Commit or stash your changes/);
});
