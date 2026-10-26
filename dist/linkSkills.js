#!/usr/bin/env node
// Links skills and agents into the repo in the current directory: each skill at
// .claude/skills/<name>, where Claude Code finds skills, and at .agents/skills/<name>, where other
// agents look, and each agent at .claude/agents/<name> and .agents/agents/<name>.
//
//   link-skills                   links skills/ and the `link` lists in vendor.json
//   link-skills grill-me rpi      also links these vendored skills
//   link-skills --list            prints every vendored skill
//
// A vendored skill can be named as `<source>/<skill>` when two sources have one with that name.
// Each link is relative, so it works in any clone. A skill or agent that the repo keeps as a real
// file or folder is left alone, so the repo's own version is used.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
const host = process.cwd();
// Node gives the real path of a package installed in node_modules, which for pnpm is inside
// node_modules/.pnpm and changes with each version, so the links go through the package's own
// node_modules entry instead.
const here = import.meta.dirname.includes('/node_modules/')
    ? join(host, 'node_modules/repo-defaults')
    : resolve(import.meta.dirname, '..');
const vendor = join(here, 'vendor');
const sources = JSON.parse(readFileSync(join(here, 'vendor.json'), 'utf8'));
// Every directory under vendor/<source> that holds a SKILL.md, relative to vendor/.
function vendoredSkills() {
    const found = [];
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory() || ['.git', 'node_modules'].includes(entry.name)) {
                continue;
            }
            const path = join(dir, entry.name);
            if (existsSync(join(path, 'SKILL.md'))) {
                found.push(relative(vendor, path));
            }
            else {
                walk(path);
            }
        }
    };
    for (const name of Object.keys(sources)) {
        walk(join(vendor, name));
    }
    return found.toSorted();
}
function find(name) {
    const [source, skill] = name.includes('/') ? name.split('/') : [undefined, name];
    const matches = vendoredSkills().filter((path) => basename(path) === skill && (source === undefined || path.startsWith(`${source}/`)));
    if (matches.length === 1) {
        return join(vendor, matches[0]);
    }
    if (matches.length === 0) {
        throw new Error(`No vendored skill is named ${name}. Run link-skills --list to see them all.`);
    }
    const names = matches.map((path) => `${path.split('/')[0]}/${skill}`);
    throw new Error(`More than one source has ${name}. Name one of ${names.join(', ')}.`);
}
const args = process.argv.slice(2);
if (args.includes('--list')) {
    for (const path of vendoredSkills()) {
        console.log(`${path.split('/')[0]}/${basename(path)}  (vendor/${path})`);
    }
}
else {
    const skills = [
        ...readdirSync(join(here, 'skills')).map((name) => join(here, 'skills', name)),
        ...Object.entries(sources).flatMap(([name, source]) => source.link.skills.map((path) => join(vendor, name, path))),
        ...args.map(find),
    ];
    const agents = Object.entries(sources).flatMap(([name, source]) => source.link.agents.map((path) => join(vendor, name, path)));
    for (const [kind, paths] of [
        ['skills', skills],
        ['agents', agents],
    ]) {
        const names = paths.map((path) => basename(path));
        const repeated = names.find((name, index) => names.indexOf(name) !== index);
        if (repeated !== undefined) {
            throw new Error(`Two ${kind} are named ${repeated}. Link only one of them.`);
        }
        for (const path of paths) {
            for (const base of ['.claude', '.agents']) {
                const target = join(host, base, kind);
                const link = join(target, basename(path));
                mkdirSync(target, { recursive: true });
                const stat = lstatSync(link, { throwIfNoEntry: false });
                if (stat) {
                    if (!stat.isSymbolicLink()) {
                        console.log(`Kept ${relative(host, link)}, which is not a link.`);
                        continue;
                    }
                    rmSync(link);
                }
                symlinkSync(relative(target, path), link);
            }
        }
    }
}
