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
// file or folder is left alone, so the repo's own version is used. A link into repo-defaults
// whose target is gone, such as a skill removed upstream, is deleted. A vendored skill that an
// earlier run linked by name is linked again, so a run with no names keeps it current.
//
// pstack sets `disable-model-invocation: true` on its skills. Claude Code then hides the skill
// from the agent, and runs it only when a person types `/<name>`. For such a skill, link-skills
// writes a folder instead of a link: its SKILL.md without that line, a link to each of the
// skill's other files, and a `.link-skills` file that marks the folder as written here, so the
// next run replaces it. The folder is written only under .agents/, which the `fmt` settings
// ignore, and .claude/ links to it, so a formatter in a pre-commit hook never rewrites it.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync, } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
const host = process.cwd();
const agentsFolder = join(host, '.agents');
// Node gives the real path of a package installed in node_modules, which for pnpm is inside
// node_modules/.pnpm and changes with each version, so the links go through the package's own
// node_modules entry instead.
const here = import.meta.dirname.includes('/node_modules/')
    ? join(host, 'node_modules/repo-defaults')
    : resolve(import.meta.dirname, '..');
const vendor = join(here, 'vendor');
const sources = JSON.parse(readFileSync(join(here, 'vendor.json'), 'utf8'));
const marker = '.link-skills';
const slashOnly = /^disable-model-invocation:\s*true\s*\n/m;
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
// The SKILL.md of `path` without the slash-command flag, or undefined if its frontmatter, the text
// between the first two `---` lines, doesn't set the flag.
function withoutFlag(path) {
    const file = join(path, 'SKILL.md');
    if (!existsSync(file)) {
        return undefined;
    }
    const skill = readFileSync(file, 'utf8');
    const end = skill.indexOf('\n---', 3);
    if (!skill.startsWith('---\n') || end === -1 || !slashOnly.test(skill.slice(0, end + 1))) {
        return undefined;
    }
    return skill.slice(0, end + 1).replace(slashOnly, '') + skill.slice(end + 1);
}
// The path that `entry`, left by an earlier run, stands for, or undefined if the repo made it.
function sourceOf(entry) {
    const stat = lstatSync(entry);
    const source = stat.isDirectory() && existsSync(join(entry, marker))
        ? resolve(entry, readFileSync(join(entry, marker), 'utf8').trim())
        : stat.isSymbolicLink()
            ? resolve(dirname(entry), readlinkSync(entry))
            : undefined;
    const isOurs = source?.startsWith(`${here}/`) || source?.startsWith(`${agentsFolder}/`);
    return isOurs ? source : undefined;
}
// Deletes what an earlier run left in `target` that now points at nothing in repo-defaults.
function prune(target) {
    for (const name of readdirSync(target)) {
        const source = sourceOf(join(target, name));
        if (source !== undefined && !existsSync(source)) {
            rmSync(join(target, name), { recursive: true });
        }
    }
}
// The vendored skills or agents that an earlier run linked under .agents/, including ones named
// on its command line, so that a run with no names, such as the update's, writes them again.
function linked(kind) {
    const target = join(agentsFolder, kind);
    if (!existsSync(target)) {
        return [];
    }
    return readdirSync(target).flatMap((name) => {
        const source = sourceOf(join(target, name));
        return source?.startsWith(`${vendor}/`) && existsSync(source) ? [source] : [];
    });
}
// Puts `path` at `entry`: a link, or for a slash-command skill a folder under .agents/ that drops
// the flag, and a link to that folder under .claude/.
function place(path, entry) {
    const skill = withoutFlag(path);
    if (skill === undefined) {
        symlinkSync(relative(dirname(entry), path), entry);
        return;
    }
    if (!entry.startsWith(`${agentsFolder}/`)) {
        const folder = join(agentsFolder, relative(join(host, '.claude'), entry));
        symlinkSync(relative(dirname(entry), folder), entry);
        return;
    }
    mkdirSync(entry);
    writeFileSync(join(entry, 'SKILL.md'), skill);
    writeFileSync(join(entry, marker), `${relative(entry, path)}\n`);
    for (const name of readdirSync(path)) {
        if (name !== 'SKILL.md') {
            symlinkSync(relative(entry, join(path, name)), join(entry, name));
        }
    }
}
const args = process.argv.slice(2);
if (args.includes('--list')) {
    for (const path of vendoredSkills()) {
        console.log(`${path.split('/')[0]}/${basename(path)}  (vendor/${path})`);
    }
}
else {
    // A skill linked earlier is kept unless a listed or named one now has its name.
    const withLinked = (listed, kind) => {
        const names = new Set(listed.map((path) => basename(path)));
        return [...new Set(listed), ...linked(kind).filter((path) => !names.has(basename(path)))];
    };
    const skills = withLinked([
        ...readdirSync(join(here, 'skills')).map((name) => join(here, 'skills', name)),
        ...Object.entries(sources).flatMap(([name, source]) => source.link.skills.map((path) => join(vendor, name, path))),
        ...args.map(find),
    ], 'skills');
    const agents = withLinked(Object.entries(sources).flatMap(([name, source]) => source.link.agents.map((path) => join(vendor, name, path))), 'agents');
    for (const [kind, paths] of [
        ['skills', skills],
        ['agents', agents],
    ]) {
        const names = paths.map((path) => basename(path));
        const repeated = names.find((name, index) => names.indexOf(name) !== index);
        if (repeated !== undefined) {
            throw new Error(`Two ${kind} are named ${repeated}. Link only one of them.`);
        }
        // .agents first, because the .claude links point at the folders written there.
        for (const base of ['.agents', '.claude']) {
            const target = join(host, base, kind);
            mkdirSync(target, { recursive: true });
            prune(target);
            for (const path of paths) {
                const entry = join(target, basename(path));
                const stat = lstatSync(entry, { throwIfNoEntry: false });
                if (stat?.isSymbolicLink() || (stat?.isDirectory() && existsSync(join(entry, marker)))) {
                    rmSync(entry, { recursive: true });
                }
                else if (stat) {
                    console.log(`Kept ${relative(host, entry)}, which is not a link.`);
                    continue;
                }
                place(path, entry);
            }
        }
    }
}
