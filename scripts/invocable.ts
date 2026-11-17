// Writes invocable/<source>/<skill>/, a copy of each vendored skill that only a typed slash
// command can run, so an agent can choose it too.
//
// pstack marks every skill `disable-model-invocation: true`. Claude Code then hides the skill
// from the agent and runs it only when a person types `/<name>`, so a linked pstack skill never
// fires in agent work. The copy holds a SKILL.md without that line, and a link to every other
// file of the skill in vendor/, so the skill's references still resolve. link-skills links the
// copy when one exists. `vendor add` and `vendor update` rewrite invocable/, and
// test/invocable.test.ts fails when it is stale.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const flag = /^disable-model-invocation:\s*true\s*\n/m;

// Every directory under `vendor` that holds a SKILL.md, relative to `vendor`.
function skills(vendor: string): string[] {
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
  walk(vendor);
  return found.toSorted();
}

// The frontmatter is the text between the first two `---` lines.
function withoutFlag(skill: string): string | undefined {
  const end = skill.indexOf('\n---', 3);
  if (!skill.startsWith('---\n') || end === -1) {
    return undefined;
  }
  const frontmatter = skill.slice(0, end + 1);
  if (!flag.test(frontmatter)) {
    return undefined;
  }
  return frontmatter.replace(flag, '') + skill.slice(end + 1);
}

/**
 * Writes `out` from scratch: one folder for each skill under `vendor` whose SKILL.md sets
 * `disable-model-invocation: true`.
 */
export function writeInvocable(vendor: string, out: string) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out);
  for (const path of skills(vendor)) {
    const source = join(vendor, path);
    const skill = withoutFlag(readFileSync(join(source, 'SKILL.md'), 'utf8'));
    if (skill === undefined) {
      continue;
    }
    const target = join(out, path);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'SKILL.md'), skill);
    for (const entry of readdirSync(source)) {
      if (entry !== 'SKILL.md') {
        symlinkSync(relative(target, join(source, entry)), join(target, entry));
      }
    }
  }
}

if (import.meta.main) {
  writeInvocable(join(process.cwd(), 'vendor'), join(process.cwd(), 'invocable'));
}
