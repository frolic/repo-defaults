#!/usr/bin/env node
// Replaces repo-defaults/ in the repo in the current directory with the newest repo-defaults, then
// links the skills again, so a skill added upstream is linked and a removed one is unlinked.
//
//   node repo-defaults/src/update.ts             takes main
//   node repo-defaults/src/update.ts <branch>    takes another branch, such as one under review
//
// repo-defaults/ holds ordinary committed files, so every clone has them with no step to fetch
// them. It holds only the files that package.json `files` lists, the same files a git dependency
// installs, so the vendored skills come without their docs, images, and test fixtures. The
// update is one commit with the new files and the new links. It reads nothing from the repo's
// history, so it works in a shallow clone and after a squash merge. Change repo-defaults in its
// own repo, because the update replaces any edit made in the copy. It refuses a change outside
// repo-defaults/, so the first copy can be read into the index and committed by this script.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';

const host = process.cwd();
const prefix = 'repo-defaults';

const git = (...args: string[]) =>
  execFileSync('git', args, {
    cwd: host,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

// A submodule shows as one entry with mode 160000, and a copy as ordinary files.
if (git('ls-files', '--stage', prefix).startsWith('160000')) {
  throw new Error(
    `${prefix}/ is a submodule. Switch it to a copy first, as SETUP.md describes under "Moving from a submodule".`,
  );
}
if (git('status', '--porcelain', '--', '.', `:!${prefix}`)) {
  throw new Error('Commit or stash your changes first, because the update commits.');
}

const manifest = JSON.parse(readFileSync(join(host, prefix, 'package.json'), 'utf8')) as {
  repository: { url: string };
};
const repo = manifest.repository.url.replace(/^git\+/, '');
const branch = process.argv[2] ?? 'main';

git('fetch', '--quiet', '--depth=1', repo, branch);
const commit = git('rev-parse', 'FETCH_HEAD');
git('rm', '-r', '-f', '--quiet', '--ignore-unmatch', prefix);
git('read-tree', `--prefix=${prefix}/`, '-u', 'FETCH_HEAD');

// npm and pnpm always pack these, and apply the `files` patterns in order, so a later `!pattern`
// drops what an earlier one added.
const always = new Set(['package.json', 'README.md', 'LICENSE']);
const { files } = JSON.parse(git('show', 'FETCH_HEAD:package.json')) as {
  files: readonly string[];
};
const isPacked = (path: string) =>
  files.reduce((packed, pattern) => {
    const glob = pattern.replace(/^!/, '');
    const matches =
      path === glob ||
      path.startsWith(`${glob}/`) ||
      matchesGlob(path, glob) ||
      matchesGlob(path, `${glob}/**`);
    return matches ? !pattern.startsWith('!') : packed;
  }, always.has(path));
const unpacked = git('ls-tree', '-r', '--name-only', 'FETCH_HEAD')
  .split('\n')
  // A copy runs src/ directly, and dist/ only serves a git dependency. Many repos ignore dist/,
  // and a hook that stages its files again, such as lint-staged, fails on an ignored path.
  .filter((path) => !isPacked(path) || path.startsWith('dist/'))
  .map((path) => `${prefix}/${path}`);
if (unpacked.length > 0) {
  execFileSync('git', ['--literal-pathspecs', 'rm', '-f', '--quiet', '--pathspec-from-file=-'], {
    cwd: host,
    input: unpacked.join('\n'),
  });
}

execFileSync(process.execPath, [join(host, prefix, 'src/linkSkills.ts')], {
  cwd: host,
  stdio: 'inherit',
});
git('add', '--all', prefix, '.claude', '.agents');
if (!git('status', '--porcelain')) {
  console.log(`repo-defaults is already at ${commit}.`);
} else {
  git('commit', '--quiet', '-m', `Update repo-defaults to ${commit.slice(0, 12)}`);
  console.log(`Updated repo-defaults to ${commit}.`);
}
