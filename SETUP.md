# Set up a repo

## Quick setup

1. Add repo-defaults as a submodule or a git dependency, as in step 1 below.
2. Run `node repo-defaults/src/init.ts`, or `pnpm exec init-repo-defaults` for the git dependency. It does steps 2, 4, 5, 7, and 9 where nothing is in the way, and is safe to run again.
3. Ask your agent to run the `setup-repo-defaults` skill. It merges the lint and format settings into your config, adds the prose test, and lists where your repo's rules disagree with these.

## Each step

Each step is independent, so take only the ones you want. The examples use the submodule paths. For a git dependency, swap in the paths from this table:

| For | Submodule | Git dependency |
| --- | --- | --- |
| Modules | `./repo-defaults/src/oxc.ts` | `repo-defaults/oxc` |
| tsconfig presets | `./repo-defaults/tsconfig/strict.json` | `repo-defaults/tsconfig/strict.json` |
| Markdown and skills | `repo-defaults/writing.md` | `node_modules/repo-defaults/writing.md` |
| Commands | `node repo-defaults/src/linkSkills.ts` | `pnpm exec link-skills` |
| | `node repo-defaults/src/commitMessage.ts` | `pnpm exec check-commit-message` |

### 1. Add repo-defaults

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

### 2. tsconfig

```json
{
  "extends": "./repo-defaults/tsconfig/strict.json",
  "compilerOptions": { "lib": ["ES2022", "DOM"], "types": [] }
}
```

Use `tsconfig/library.json` instead for a published library. The presets leave out `lib`, `types`, and output settings, because those depend on where the code runs.

### 3. oxfmt and oxlint

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

### 4. Agent instructions

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

### 5. Skills

```sh
node repo-defaults/src/linkSkills.ts
```

Run it again after an update that adds a skill. It links each skill into `.claude/skills/` and `.agents/skills/`, and each agent into `.claude/agents/` and `.agents/agents/`. The links are relative, so they work in any clone.

- **What it links:** everything in `skills/`, plus the `link` lists in `vendor.json`, which today hold the pstack skills for writing, design, review, and testing.
- **More skills:** `--list` shows every vendored skill, and naming them links them too: `node repo-defaults/src/linkSkills.ts grill-me humanlayer-skills/rpi`.
- **Repeated names:** write `<source>/<skill>` when two sources have a skill with that name, such as `pstack/teach`.
- **Your own copy:** a skill your repo keeps as a real folder is left alone.

To keep your repo's picks, put the command in a package.json script.

### 6. Prose checks

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

### 7. Git hooks

```sh
git config core.hooksPath repo-defaults/hooks
```

Add the same command as the package.json `prepare` script, so each clone sets it on `pnpm install`. The hooks:

- **pre-commit** runs the `check:staged` script.
- **pre-push** checks that the lockfile matches each package.json, then runs `check` and `test:changed`. It holds a lock, so two worktrees don't push at once.
- **commit-msg** runs the commit message checks.

A hook skips a script the repo doesn't have. If the repo has hooks of its own, call `repo-defaults/hooks/<name>` from them instead of setting `core.hooksPath`.

### 8. Package scripts

[workflow.md](workflow.md#checks-and-ci) lists where each check runs. Define these scripts with your repo's tools:

| Script | Runs | Example |
| --- | --- | --- |
| `check:staged` | Format and lint the staged files | `vp staged` |
| `check` | Format check, lint, and type-check | `vp check && tsc -b` |
| `test:changed` | The tests the diff from `origin/main` affects | `vitest run --changed origin/main` |
| `test` | The suite CI runs on `main` | `vitest run` |
| `test:full` | Everything, before a release | `vitest run && pnpm test:e2e` |

### 9. Agent settings

Copy `repo-defaults/templates/claude/settings.json` to `.claude/settings.json`, or add its `deny` rules and its `hooks` to yours. The rules stop Claude Code from starting or re-running a CI job and from passing `--no-verify`. The hook runs `src/refuseInPlaceEdits.ts` before each shell command, and refuses `sed -i`, `perl -i`, and a script that writes files, so each change goes through the Edit or Write tool and shows as a diff. For the git dependency, the hook runs `node_modules/repo-defaults/dist/refuseInPlaceEdits.js` instead, and init writes that path.

Copy `repo-defaults/templates/claude/corrections.md` to `.claude/corrections.md`, and schedule the `retro` skill once a day. [workflow.md](workflow.md#corrections-and-retro) says how the log works. A test keeps each repeated correction tied to a check:

```ts
import { unenforcedCorrections } from '../repo-defaults/src/unenforcedCorrections.ts';

test('each correction given twice has a check', () => {
  expect(unenforcedCorrections(join(root, '.claude/corrections.md'))).toEqual([]);
});
```

### 10. CI

```sh
mkdir -p .github/workflows
cp repo-defaults/templates/github/workflows/*.yml .github/workflows/
```

`checks.yml` runs `check` and `test` on each push to `main`, in the merge queue, and when started by hand. `full.yml` runs `test:full` when started by hand or called from a release workflow. Neither runs on a pull request, because the hooks already ran the checks before the push.

### 11. More checks

Each of these is a function you call from a test, for the repos it fits.

#### Public interface

If other packages, apps, or repos import yours, print the exports of their entries and compare them with a committed file. The test fails when a name is added, removed, or changes its type, and the diff of the file shows the change to the owner. Rewrite the file with `-u` only once the owner agrees.

```ts
import { publicInterface } from '../repo-defaults/src/publicInterface.ts';

test('the public interface changes only with the owner agreement', async () => {
  await expect(
    publicInterface([{ specifier: '@acme/sdk', path: join(root, 'packages/sdk/src/index.ts') }]),
  ).toMatchFileSnapshot('./publicInterface.txt');
});
```

#### Exact versions and release age

Copy `repo-defaults/templates/pnpm/pnpm-workspace.yaml`, or add its `minimumReleaseAge` line to yours, so pnpm refuses a version younger than 14 days. If the lockfile already holds younger versions, `pnpm install --frozen-lockfile` fails until they turn 14 days old, so list them in `minimumReleaseAgeExclude` until then. Then pin each range to the version in the lockfile.

```ts
import { minimumReleaseAge } from '../repo-defaults/src/minimumReleaseAge.ts';
import { versionRanges } from '../repo-defaults/src/versionRanges.ts';

test('each dependency names an exact version', () => {
  expect(versionRanges(root)).toEqual([]);
});

test('pnpm refuses a release younger than 14 days', () => {
  expect(minimumReleaseAge(root)).toBeGreaterThanOrEqual(14 * 24 * 60);
});
```

#### Property tests

If the repo has property tests, give them one fixed seed in a setup file that every test project loads, such as `setupFiles: ['./vitest.setup.ts']`. With fast-check:

```ts
import fc from 'fast-check';
import { beforeEach } from 'vitest';
import { propertySeed } from './repo-defaults/src/propertySeed.ts';

const seed = propertySeed(process.env);
fc.configureGlobal({ seed });

beforeEach(({ onTestFailed }) => {
  onTestFailed(() => console.error(`Property tests drew their inputs with PROPERTY_SEED=${seed}.`));
});
```

With Effect, call `Arbitrary.configureGlobal({ check: { seed: String(seed) } })` instead. `PROPERTY_SEED=<seed> pnpm vitest run` draws other inputs.

#### Workspace checks

In a workspace, these find a dependency that a package lists but doesn't use; a name that an entry exports but nothing uses; and a type beside a function that files in three or more folders import, which typescript.md moves to its own file. They read the whole workspace, so `vitest --changed` doesn't see the files they depend on. Run them from a test that the pre-push hook's `check` script runs. Pass `docs` for a doc outside the package READMEs that shows names to callers outside the workspace.

```ts
import { sharedTypes } from '../repo-defaults/src/sharedTypes.ts';
import { unusedDependencies } from '../repo-defaults/src/unusedDependencies.ts';
import { unusedEntryNames } from '../repo-defaults/src/unusedEntryNames.ts';

test('each package lists only dependencies it uses', () => {
  expect(unusedDependencies(root)).toEqual([]);
});

test('each entry exports only names that something uses', () => {
  expect(unusedEntryNames(root, { docs: [join(root, 'docs/client.md')] })).toEqual([]);
});

test('a type that many folders import sits in a file of its own name', () => {
  expect(sharedTypes(root)).toEqual([]);
});
```
