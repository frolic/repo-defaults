#!/usr/bin/env node
// Replaces repo-defaults/ in the repo in the current directory with the newest repo-defaults, then
// links the skills again, so a skill added upstream is linked and a removed one is unlinked.
//
//   node repo-defaults/src/update.ts             takes main
//   node repo-defaults/src/update.ts <branch>    takes another branch, such as one under review
//
// repo-defaults/ holds ordinary committed files, so every clone has them with no step to fetch
// them. The update is one commit with the new files and the new links. It reads nothing from the
// repo's history, so it works in a shallow clone and after a squash merge. Change repo-defaults
// in its own repo, because the update replaces any edit made in the copy. It needs a clean
// working tree.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
if (git('status', '--porcelain')) {
  throw new Error('Commit or stash your changes first, because the update commits.');
}

const manifest = JSON.parse(readFileSync(join(host, prefix, 'package.json'), 'utf8')) as {
  repository: { url: string };
};
const repo = manifest.repository.url.replace(/^git\+/, '');
const branch = process.argv[2] ?? 'main';

git('fetch', '--quiet', '--depth=1', repo, branch);
const commit = git('rev-parse', 'FETCH_HEAD');
git('rm', '-r', '--quiet', prefix);
git('read-tree', `--prefix=${prefix}/`, '-u', 'FETCH_HEAD');

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
