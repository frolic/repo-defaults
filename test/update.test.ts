import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
  execFileSync('git', args, { cwd, encoding: 'utf8', env, stdio: 'pipe' }).trim();

function commit(dir: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '--quiet', '-m', 'Change');
}

function repo(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'repo-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  commit(dir, files);
  return dir;
}

const skill = (name: string) => `---\nname: ${name}\ndescription: A test skill.\n---\n`;

test('update pulls the newest repo-defaults and links its new skills', () => {
  const upstream = mkdtempSync(join(tmpdir(), 'upstream-'));
  git(upstream, 'init', '--quiet', '--initial-branch=main');
  commit(upstream, {
    'package.json': JSON.stringify({ repository: { url: upstream } }),
    'vendor.json': '{}\n',
    'src/update.ts': readFileSync(join(root, 'src/update.ts'), 'utf8'),
    'src/linkSkills.ts': readFileSync(join(root, 'src/linkSkills.ts'), 'utf8'),
    'skills/first/SKILL.md': skill('first'),
  });
  const host = repo({ 'README.md': 'host' });
  git(host, 'subtree', 'add', '--quiet', '--prefix=repo-defaults', upstream, 'main', '--squash');

  commit(upstream, { 'skills/second/SKILL.md': skill('second'), 'writing.md': 'new' });
  execFileSync(process.execPath, [join(host, 'repo-defaults/src/update.ts')], {
    cwd: host,
    env,
    stdio: 'pipe',
  });

  expect(readFileSync(join(host, 'repo-defaults/writing.md'), 'utf8')).toBe('new');
  expect(existsSync(join(host, '.claude/skills/second/SKILL.md'))).toBe(true);
  expect(git(host, 'status', '--porcelain')).toBe('');
  expect(git(host, 'log', '-1', '--format=%s')).toBe('Link the skills from the new repo-defaults');
}, 60_000);

test('update refuses a submodule', () => {
  const upstream = repo({ 'package.json': '{}' });
  const host = repo({ 'README.md': 'host' });
  git(
    host,
    '-c',
    'protocol.file.allow=always',
    'submodule',
    'add',
    '--quiet',
    upstream,
    'repo-defaults',
  );
  git(host, 'commit', '--quiet', '-m', 'Add submodule');
  expect(() =>
    execFileSync(process.execPath, [join(root, 'src/update.ts')], {
      cwd: host,
      env,
      stdio: 'pipe',
    }),
  ).toThrow(/is a submodule/);
});
