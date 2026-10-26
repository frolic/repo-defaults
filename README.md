# repo-defaults

Rules and tooling that I use across my repos: writing rules, TypeScript style, tsconfig presets, settings for oxfmt and oxlint, prose checks, and agent skills. They started in [Portable](https://github.com/portablejs/portable) and moved here so other repos can include them.

The files work two ways without a build step on your side: as a git submodule at `repo-defaults/`, or as a git dependency installed into `node_modules/repo-defaults`. Nothing is published to npm yet.

## What's here

| Path | What it is |
| --- | --- |
| `writing.md` | Rules for docs, comments, commit messages, and PR text, with a table of sentences to avoid and their rewrites. |
| `typescript.md` | TypeScript style and API shape rules. |
| `tsconfig/strict.json` | Strict compiler options with nothing runtime-specific. |
| `tsconfig/library.json` | `strict.json` plus declarations, source maps, and `isolatedDeclarations`, for a published library. |
| `src/oxc.ts` | `fmt` and `lint` settings for `vite.config.ts`. |
| `src/oxlint.ts` | An oxlint plugin with five rules under the `defaults/` prefix: `import-extension`, `no-enum`, `optional-undefined`, `prefer-satisfies`, and `type-parameter-name`. |
| `src/prose.ts` | Checks for a made-up actor, a missing serial comma, ruled-out words, and a package name in a code span, plus `check` to run them over files. |
| `src/commitMessage.ts` | `check-commit-message`, which runs two of the prose checks on a commit message. |
| `src/linkSkills.ts` | `link-skills`, which links the skills and agents into `.claude/` and `.agents/`. |
| `skills/` | Skills written here, such as `prose-review`. |
| `vendor/pstack/` | Skills and the `comment-sicko` agent copied unchanged from [pstack](https://github.com/cursor/plugins/tree/main/pstack). |

## Add it to a repo

As a submodule:

```sh
git submodule add https://github.com/frolic/repo-defaults repo-defaults
git config submodule.recurse true
git config push.recurseSubmodules on-demand
```

`submodule.recurse` makes `pull`, `checkout`, and `switch` update the submodule too. `push.recurseSubmodules on-demand` pushes a new repo-defaults commit before the commit that points at it, so you never push a pointer nobody else can fetch. Clone a repo that has the submodule with `git clone --recurse-submodules`, or run `git submodule update --init` after a plain clone. In GitHub Actions, pass `submodules: true` to `actions/checkout`.

As a git dependency:

```sh
pnpm add -D github:frolic/repo-defaults
```

The built JavaScript in `dist/` is committed, so the install runs no build script.

The rest of this section shows the submodule paths. With the git dependency, use package paths such as `repo-defaults/oxc` instead of file paths such as `./repo-defaults/src/oxc.ts`, and `node_modules/repo-defaults/` for the Markdown files and skills.

### tsconfig

```json
{
  "extends": "./repo-defaults/tsconfig/strict.json",
  "compilerOptions": { "lib": ["ES2022", "DOM"], "types": [] }
}
```

The presets leave out `lib`, `types`, and output settings, because those depend on where the code runs.

### oxfmt and oxlint

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

The settings already ignore `repo-defaults/**`, so the host's own rules don't run on this repo's files. If you check it out somewhere else, add that path to both `ignorePatterns` lists.

### Agent instructions

Import both rule files from CLAUDE.md, so Claude Code loads them as project instructions:

```md
@AGENTS.md
@repo-defaults/writing.md
@repo-defaults/typescript.md
```

Then add a line near the top of AGENTS.md for agents that don't follow imports: "Follow the rules in repo-defaults/writing.md and repo-defaults/typescript.md. They apply to every change in this repo."

### Skills

Run this from the repo root after you add repo-defaults, and again after an update that adds a skill:

```sh
node repo-defaults/src/linkSkills.ts
```

With the git dependency, run `pnpm exec link-skills`. It creates relative links at `.claude/skills/<name>` and `.agents/skills/<name>`, and links the agents into `.claude/agents/` and `.agents/agents/`. It leaves alone any skill your repo keeps as a real folder, so a repo can replace one.

### Prose checks

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

Pass `tables` for files whose tables quote sentences to avoid in the first column, and `skip` to leave a file out of one rule.

### Commit messages

In a commit-msg hook:

```sh
node repo-defaults/src/commitMessage.ts "$1"
```

With the git dependency, run `pnpm exec check-commit-message "$1"`.

## Change the defaults

Edit the files in `repo-defaults/` and try them in the host repo. Then make two commits: one in `repo-defaults/`, pushed to this repo's `main`, and one in the host repo that records the new submodule commit with `git add repo-defaults`. A submodule checks out a commit, not a branch, so run `git switch main` inside `repo-defaults/` before you edit.

With the git dependency, push the change here and run `pnpm update repo-defaults` in the host repo.

## Development

```sh
pnpm install
pnpm test
pnpm check
pnpm check:types
```

Node 24 or later runs the TypeScript files directly. See [AGENTS.md](AGENTS.md) for how this repo is laid out.

## License

MIT. The files in `vendor/pstack/` keep their own MIT license.
