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
// whose target is gone, such as a skill removed upstream, is deleted.
//
// pstack sets `disable-model-invocation: true` on its skills. Claude Code then hides the skill
// from the agent, and runs it only when a person types `/<name>`. For such a skill, link-skills
// writes a folder instead of a link: its SKILL.md without that line, a link to each of the
// skill's other files, and a `.link-skills` file that marks the folder as written here, so the
// next run replaces it.
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

type Source = { link: { skills: readonly string[]; agents: readonly string[] } };

const host = process.cwd();
// Node gives the real path of a package installed in node_modules, which for pnpm is inside
// node_modules/.pnpm and changes with each version, so the links go through the package's own
// node_modules entry instead.
const here = import.meta.dirname.includes('/node_modules/')
  ? join(host, 'node_modules/repo-defaults')
  : resolve(import.meta.dirname, '..');
const vendor = join(here, 'vendor');
const sources = JSON.parse(readFileSync(join(here, 'vendor.json'), 'utf8')) as Record<
  string,
  Source
>;
const marker = '.link-skills';
const slashOnly = /^disable-model-invocation:\s*true\s*\n/m;

// Every directory under vendor/<source> that holds a SKILL.md, relative to vendor/.
function vendoredSkills(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || ['.git', 'node_modules'].includes(entry.name)) {
        continue;
      }
      const path = join(dir, entry.name);
      if (existsSync(join(path, 'SKILL.md'))) {
        found.push(relative(vendor, path));
      } else {
        walk(path);
      }
    }
  };
  for (const name of Object.keys(sources)) {
    walk(join(vendor, name));
  }
  return found.toSorted();
}

function find(name: string): string {
  const [source, skill] = name.includes('/') ? name.split('/') : [undefined, name];
  const matches = vendoredSkills().filter(
    (path) => basename(path) === skill && (source === undefined || path.startsWith(`${source}/`)),
  );
  if (matches.length === 1) {
    return join(vendor, matches[0]!);
  }
  if (matches.length === 0) {
    throw new Error(`No vendored skill is named ${name}. Run link-skills --list to see them all.`);
  }
  const names = matches.map((path) => `${path.split('/')[0]}/${skill}`);
  throw new Error(`More than one source has ${name}. Name one of ${names.join(', ')}.`);
}

// The SKILL.md of `path` without the slash-command flag, or undefined if its frontmatter, the text
// between the first two `---` lines, doesn't set the flag.
function withoutFlag(path: string): string | undefined {
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

// Deletes what an earlier run left in `target` that now points at nothing in repo-defaults.
function prune(target: string) {
  for (const name of readdirSync(target)) {
    const entry = join(target, name);
    const stat = lstatSync(entry);
    const written = stat.isDirectory() && existsSync(join(entry, marker));
    const source = written
      ? resolve(entry, readFileSync(join(entry, marker), 'utf8').trim())
      : stat.isSymbolicLink()
        ? resolve(target, readlinkSync(entry))
        : undefined;
    if (source?.startsWith(`${here}/`) && !existsSync(source)) {
      rmSync(entry, { recursive: true });
    }
  }
}

// Puts `path` at `entry`: a link, or for a slash-command skill a folder that drops the flag.
function place(path: string, entry: string) {
  const skill = withoutFlag(path);
  if (skill === undefined) {
    symlinkSync(relative(dirname(entry), path), entry);
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
} else {
  const skills = [
    ...readdirSync(join(here, 'skills')).map((name) => join(here, 'skills', name)),
    ...Object.entries(sources).flatMap(([name, source]) =>
      source.link.skills.map((path) => join(vendor, name, path)),
    ),
    ...args.map(find),
  ];
  const agents = Object.entries(sources).flatMap(([name, source]) =>
    source.link.agents.map((path) => join(vendor, name, path)),
  );
  for (const [kind, paths] of [
    ['skills', skills],
    ['agents', agents],
  ] as const) {
    const names = paths.map((path) => basename(path));
    const repeated = names.find((name, index) => names.indexOf(name) !== index);
    if (repeated !== undefined) {
      throw new Error(`Two ${kind} are named ${repeated}. Link only one of them.`);
    }
    for (const base of ['.claude', '.agents']) {
      const target = join(host, base, kind);
      mkdirSync(target, { recursive: true });
      prune(target);
      for (const path of paths) {
        const entry = join(target, basename(path));
        const stat = lstatSync(entry, { throwIfNoEntry: false });
        if (stat?.isSymbolicLink() || (stat?.isDirectory() && existsSync(join(entry, marker)))) {
          rmSync(entry, { recursive: true });
        } else if (stat) {
          console.log(`Kept ${relative(host, entry)}, which is not a link.`);
          continue;
        }
        place(path, entry);
      }
    }
  }
}
