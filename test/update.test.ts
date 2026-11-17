import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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

test('update replaces repo-defaults with the newest copy and relinks its skills', () => {
  const upstream = mkdtempSync(join(tmpdir(), 'upstream-'));
  git(upstream, 'init', '--quiet', '--initial-branch=main');
  commit(upstream, {
    'package.json': JSON.stringify({
      repository: { url: upstream },
      files: ['dist', 'src', 'skills', 'vendor.json', 'writing.md', '!skills/first/fixtures'],
    }),
    'vendor.json': '{}\n',
    'src/update.ts': readFileSync(join(root, 'src/update.ts'), 'utf8'),
    'src/linkSkills.ts': readFileSync(join(root, 'src/linkSkills.ts'), 'utf8'),
    'skills/first/SKILL.md': skill('first'),
    'skills/first/fixtures/large.txt': 'fixture',
    'docs/guide.md': 'guide',
    'dist/update.js': 'built',
  });
  // SETUP.md adds the copy by reading the whole tree into the index and running the update.
  const host = repo({ 'README.md': 'host' });
  git(host, 'fetch', '--quiet', upstream, 'main');
  git(host, 'read-tree', '--prefix=repo-defaults/', '-u', 'FETCH_HEAD');
  const update = () =>
    execFileSync(process.execPath, [join(host, 'repo-defaults/src/update.ts')], {
      cwd: host,
      env,
      stdio: 'pipe',
    });
  update();
  expect(git(host, 'ls-files', 'repo-defaults').split('\n')).toEqual([
    'repo-defaults/package.json',
    'repo-defaults/skills/first/SKILL.md',
    'repo-defaults/src/linkSkills.ts',
    'repo-defaults/src/update.ts',
    'repo-defaults/vendor.json',
  ]);
  expect(existsSync(join(host, 'repo-defaults/docs'))).toBe(false);
  expect(existsSync(join(host, '.claude/skills/first/SKILL.md'))).toBe(true);
  expect(git(host, 'status', '--porcelain')).toBe('');

  rmSync(join(upstream, 'skills/first'), { recursive: true });
  commit(upstream, { 'skills/second/SKILL.md': skill('second'), 'writing.md': 'new' });
  const before = git(host, 'rev-list', '--count', 'HEAD');
  update();

  expect(readFileSync(join(host, 'repo-defaults/writing.md'), 'utf8')).toBe('new');
  expect(existsSync(join(host, 'repo-defaults/skills/first'))).toBe(false);
  expect(existsSync(join(host, '.claude/skills/second/SKILL.md'))).toBe(true);
  expect(lstatSync(join(host, '.claude/skills/first'), { throwIfNoEntry: false })).toBe(undefined);
  expect(git(host, 'status', '--porcelain')).toBe('');
  expect(Number(git(host, 'rev-list', '--count', 'HEAD'))).toBe(Number(before) + 1);
  expect(git(host, 'log', '-1', '--format=%s')).toBe(
    `Update repo-defaults to ${git(upstream, 'rev-parse', 'HEAD').slice(0, 12)}`,
  );
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
