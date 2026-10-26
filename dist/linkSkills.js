#!/usr/bin/env node
// Links each skill in skills/ and vendor/pstack/skills/ into the repo in the current directory, at
// .claude/skills/<name>, where Claude Code finds skills, and at .agents/skills/<name>, where other
// agents look. The agents in vendor/pstack/agents/ are linked into .claude/agents/ and
// .agents/agents/ the same way. Each link is relative, so it works in any clone. A skill or agent
// that the repo keeps as a real file or folder is left alone, so the repo's own version is used.
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const host = process.cwd();
// Node gives the real path of a package installed in node_modules, which for pnpm is inside
// node_modules/.pnpm and changes with each version, so the links go through the package's own
// node_modules entry instead.
const installed = join(host, 'node_modules/repo-defaults');
const here = import.meta.dirname.includes('/node_modules/')
    ? installed
    : resolve(import.meta.dirname, '..');
const sources = [
    { kind: 'skills', dir: join(here, 'skills') },
    { kind: 'skills', dir: join(here, 'vendor/pstack/skills') },
    { kind: 'agents', dir: join(here, 'vendor/pstack/agents') },
];
for (const { kind, dir } of sources) {
    if (!existsSync(dir)) {
        continue;
    }
    for (const name of readdirSync(dir)) {
        for (const base of ['.claude', '.agents']) {
            const target = join(host, base, kind);
            const link = join(target, name);
            mkdirSync(target, { recursive: true });
            const stat = lstatSync(link, { throwIfNoEntry: false });
            if (stat) {
                if (!stat.isSymbolicLink()) {
                    console.log(`Kept ${relative(host, link)}, which is not a link.`);
                    continue;
                }
                rmSync(link);
            }
            symlinkSync(relative(target, join(dir, name)), link);
        }
    }
}
