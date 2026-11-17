#!/usr/bin/env node
// Pulls the newest repo-defaults into the repo in the current directory, then links the skills
// again, so a skill added upstream is linked too.
//
//   node repo-defaults/src/update.ts             pulls main
//   node repo-defaults/src/update.ts <branch>    pulls another branch, such as one under review
//
// repo-defaults/ is a git subtree: ordinary files that every clone has, with no step to fetch
// them. The pull is one squashed commit, and the links, if they changed, are a second. It needs a
// clean working tree, because git subtree commits.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const host = process.cwd();
const prefix = 'repo-defaults';
const git = (...args) => execFileSync('git', args, {
    cwd: host,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
}).trim();
// A submodule shows as one entry with mode 160000, and a subtree as ordinary files.
if (git('ls-files', '--stage', prefix).startsWith('160000')) {
    throw new Error(`${prefix}/ is a submodule. Switch it to a subtree first, as SETUP.md describes under "Moving from a submodule".`);
}
if (git('status', '--porcelain')) {
    throw new Error('Commit or stash your changes first, because git subtree commits.');
}
const manifest = JSON.parse(readFileSync(join(host, prefix, 'package.json'), 'utf8'));
const repo = manifest.repository.url.replace(/^git\+/, '');
const branch = process.argv[2] ?? 'main';
const commit = git('ls-remote', repo, `refs/heads/${branch}`).split('\t')[0];
git('subtree', 'pull', '--quiet', `--prefix=${prefix}`, repo, branch, '--squash', '-m', `Update repo-defaults to ${commit.slice(0, 12)}`);
execFileSync(process.execPath, [join(host, prefix, 'src/linkSkills.ts')], {
    cwd: host,
    stdio: 'inherit',
});
git('add', '--all', '.claude', '.agents');
if (git('status', '--porcelain')) {
    git('commit', '--quiet', '-m', 'Link the skills from the new repo-defaults');
}
console.log(`Updated repo-defaults to ${commit}.`);
