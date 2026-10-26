# Set up a repo

Each step is independent, so take only the ones you want. The examples use the submodule paths. For a git dependency, swap in the paths from this table:

| For | Submodule | Git dependency |
| --- | --- | --- |
| Modules | `./repo-defaults/src/oxc.ts` | `repo-defaults/oxc` |
| tsconfig presets | `./repo-defaults/tsconfig/strict.json` | `repo-defaults/tsconfig/strict.json` |
| Markdown and skills | `repo-defaults/writing.md` | `node_modules/repo-defaults/writing.md` |
| Commands | `node repo-defaults/src/linkSkills.ts` | `pnpm exec link-skills` |
| | `node repo-defaults/src/commitMessage.ts` | `pnpm exec check-commit-message` |

## 1. Add repo-defaults

As a submodule:

```sh
git submodule add https://github.com/frolic/repo-defaults repo-defaults
git config submodule.recurse true
git config push.recurseSubmodules on-demand
```

- `submodule.recurse` makes `pull`, `checkout`, and `switch` update the submodule too.
- `push.recurseSubmodules on-demand` pushes a new repo-defaults commit before the commit that points at it, so you never push a pointer nobody else can fetch.
- Clone with `git clone --recurse-submodules`, or run `git submodule update --init` after a plain clone.
- In GitHub Actions, pass `submodules: true` to `actions/checkout`.

As a git dependency:

```sh
pnpm add -D github:frolic/repo-defaults
```

The built JavaScript in `dist/` is committed, so the install runs no build script.

## 2. tsconfig

```json
{
  "extends": "./repo-defaults/tsconfig/strict.json",
  "compilerOptions": { "lib": ["ES2022", "DOM"], "types": [] }
}
```

Use `tsconfig/library.json` instead for a published library. The presets leave out `lib`, `types`, and output settings, because those depend on where the code runs.

## 3. oxfmt and oxlint

```ts
import { defineConfig } from 'vite-plus';
import { fmt, lint } from './repo-defaults/src/oxc.ts';

export default defineConfig({
  fmt,
  lint: {
    ...lint,
    rules: { ...lint.rules, 'no-console': 'off' },
    overrides: [...lint.overrides],
  },
});
```

The settings already ignore `repo-defaults/**`, so your repo's own rules don't run on these files. If you check it out somewhere else, add that path to both `ignorePatterns` lists.

## 4. Agent instructions

In CLAUDE.md, so Claude Code loads the rules as project instructions:

```md
@AGENTS.md
@repo-defaults/writing.md
@repo-defaults/typescript.md
@repo-defaults/principles.md
@repo-defaults/workflow.md
```

Near the top of AGENTS.md, for agents that don't follow imports:

```md
Follow the rules in repo-defaults/writing.md, repo-defaults/typescript.md, repo-defaults/principles.md, and repo-defaults/workflow.md. They apply to every change in this repo.
```

## 5. Skills

```sh
node repo-defaults/src/linkSkills.ts
```

Run it again after an update that adds a skill. It links each skill into `.claude/skills/` and `.agents/skills/`, and each agent into `.claude/agents/` and `.agents/agents/`. The links are relative, so they work in any clone.

- **What it links:** everything in `skills/`, plus the `link` lists in `vendor.json`, which today hold the pstack skills for writing, design, review, and testing.
- **More skills:** `--list` shows every vendored skill, and naming them links them too: `node repo-defaults/src/linkSkills.ts grill-me humanlayer-skills/rpi`.
- **Repeated names:** write `<source>/<skill>` when two sources have a skill with that name, such as `pstack/teach`.
- **Your own copy:** a skill your repo keeps as a real folder is left alone.

To keep your repo's picks, put the command in a package.json script.

## 6. Prose checks

Run `check` from a test, so it runs with the rest of your tests:

```ts
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { check, walk } from '../repo-defaults/src/prose.ts';

const root = join(import.meta.dirname, '..');

test('the prose follows writing.md', () => {
  expect(check(walk(root, { skip: [join(root, 'repo-defaults')] }), { root })).toEqual([]);
});
```

Pass `tables` for files whose tables quote sentences to avoid in the first column, and `skip` to leave a file out of one rule. To cap a doc's length, test `countWords(file)` against a number you lower as the doc shrinks.

## 7. Commit messages

In a commit-msg hook:

```sh
node repo-defaults/src/commitMessage.ts "$1"
```
