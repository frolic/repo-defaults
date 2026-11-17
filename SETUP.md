# Set up a repo

## Quick setup

1. Add a copy of repo-defaults, as in step 1 below.
2. Run `node repo-defaults/src/init.ts`, or `pnpm exec init-repo-defaults` for the git dependency. It does steps 2, 4, 5, 7, and 9 where nothing is in the way, and is safe to run again.
3. Ask your agent to run the `setup-repo-defaults` skill. It merges the lint and format settings into your config, adds the prose test, and lists where your repo's rules disagree with these.
4. Check the setup from a fresh clone, as in step 11.

## Each step

Each step is independent, so take only the ones you want. The examples use the paths of the copy. For a git dependency, swap in the paths from this table:

| For                 | Copy                                      | Git dependency                          |
| ------------------- | ----------------------------------------- | --------------------------------------- |
| Modules             | `./repo-defaults/src/oxc.ts`              | `repo-defaults/oxc`                     |
| tsconfig presets    | `./repo-defaults/tsconfig/strict.json`    | `repo-defaults/tsconfig/strict.json`    |
| Markdown and skills | `repo-defaults/writing.md`                | `node_modules/repo-defaults/writing.md` |
| Commands            | `node repo-defaults/src/linkSkills.ts`    | `pnpm exec link-skills`                 |
|                     | `node repo-defaults/src/commitMessage.ts` | `pnpm exec check-commit-message`        |

### 1. Add repo-defaults

As a copy, which we recommend:

```sh
git fetch --depth=1 https://github.com/frolic/repo-defaults main
git read-tree --prefix=repo-defaults/ -u FETCH_HEAD
node repo-defaults/src/update.ts
```

This commits the files of repo-defaults into your repo. The update script keeps only the files that `files` in its package.json lists, which are the files a git dependency installs, minus the built `dist/` that a copy doesn't run. Then it commits them. Every clone then has them with nothing to fetch, so the rules and skills load everywhere: on your machine, in CI, and in a cloud agent session. The git hooks also need `pnpm install`, as step 7 says. A submodule doesn't work for agents, because its folder is empty in a plain clone, and a cloud session clones without submodules. Claude Code reads CLAUDE.md and finds the skills before any hook could fetch the submodule, and a cloud session starts in the folder above the repos, where a repo's own hooks don't run.

- **Update:** run `node repo-defaults/src/update.ts`, or `pnpm repo-defaults:update`, which init adds. It replaces `repo-defaults/` with the newest `main` and links the skills again, in one commit. It reads nothing from your history, so it works in a shallow clone and after a squash merge. Pass a branch name to try a branch of repo-defaults first.
- **Edit:** change repo-defaults in its own repo, then update. The update replaces any edit made in your copy.
- **Size:** about 1.4 MB of files, most of it the vendored skills. The copy leaves out the vendored repos' docs, images, and test fixtures, and the tests and scripts of repo-defaults itself. Each update adds one commit, and the history of repo-defaults stays out of your repo.

As a git dependency:

```sh
pnpm add -D github:frolic/repo-defaults
```

The built JavaScript in `dist/` is committed, so the install runs no build script. The files exist only after `pnpm install`, so a cloud agent session that doesn't install first has no rules or skills. Use the copy if agents work in the repo.

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

The update script runs it again for you. It links each skill into `.claude/skills/` and `.agents/skills/`, and each agent into `.claude/agents/` and `.agents/agents/`. The links are relative, so they work in any clone. Commit them.

- **What it links:** everything in `skills/`, plus the `link` lists in `vendor.json`, which today hold the pstack skills for writing, design, review, and testing, and the pstack principles.
- **Agents can choose them:** pstack marks each skill `disable-model-invocation: true`, so Claude Code hides it from the agent and runs it only when a person types `/<name>`. For a skill with that line, link-skills writes a folder instead of a link: the SKILL.md without the line, a link to each of the skill's other files, and a `.link-skills` file that marks the folder as its own. It writes the folder under `.agents/skills/` and links `.claude/skills/` to it, so keep `.agents/**` in your formatter's ignore list, as the `fmt` settings do. The agent then sees the skill's description and runs it when the work fits.
- **Removed skills:** a link into repo-defaults whose skill is gone is deleted.
- **More skills:** `--list` shows every vendored skill, and naming them links them too: `node repo-defaults/src/linkSkills.ts grill-me humanlayer-skills/rpi`. Later runs, including the update's, keep a skill linked this way and write it again from the new copy, so you name it only once.
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

Skip both commands if the repo installs its hooks with simple-git-hooks, husky, or lefthook. Those tools install their own hooks, and simple-git-hooks writes them into `core.hooksPath`, which overwrites the shared hooks. Call the shared hooks from the tool's hooks instead, as in this simple-git-hooks config:

```json
"simple-git-hooks": {
  "pre-commit": "sh repo-defaults/hooks/pre-commit",
  "pre-push": "sh repo-defaults/hooks/pre-push",
  "commit-msg": "sh repo-defaults/hooks/commit-msg \"$1\""
}
```

In lefthook, pass the message file as `{1}` instead of `"$1"`.

### 8. Package scripts

[workflow.md](workflow.md#checks-and-ci) lists where each check runs. Define these scripts with your repo's tools:

| Script         | Runs                                          | Example                            |
| -------------- | --------------------------------------------- | ---------------------------------- |
| `check:staged` | Format and lint the staged files              | `vp staged`                        |
| `check`        | Format check, lint, and type-check            | `vp check && tsc -b`               |
| `test:changed` | The tests the diff from `origin/main` affects | `vitest run --changed origin/main` |
| `test`         | The suite CI runs on `main`                   | `vitest run`                       |
| `test:full`    | Everything, before a release                  | `vitest run && pnpm test:e2e`      |

### 9. Agent settings

Copy `repo-defaults/templates/claude/settings.json` to `.claude/settings.json`, or add its `deny` rules to yours. They stop Claude Code from starting or re-running a CI job and from passing `--no-verify`.

### 10. CI

```sh
mkdir -p .github/workflows
cp repo-defaults/templates/github/workflows/*.yml .github/workflows/
```

`checks.yml` runs `check` and `test` on each push to `main`, in the merge queue, and when started by hand. `full.yml` runs `test:full` when started by hand or called from a release workflow. Neither runs on a pull request, because the hooks already ran the checks before the push.

`merge_group` fires only if `main` requires a merge queue, through a ruleset or a branch protection rule. Add a ruleset with a merge queue that requires the Checks job on the Rules page under the repo's Settings. If a workflow deploys, skip its deploy steps on `merge_group` with `if: github.event_name != 'merge_group'`, because the change isn't on `main` yet.

To add buttons to the pull request page, copy the button file:

```sh
cp repo-defaults/templates/github/pr-buttons.yml .github/pr-buttons.yml
```

Its Run full suite button starts `full.yml` on the pull request's branch, through the GitHub PR Buttons browser extension. If you deploy previews, uncomment the Deploy PR preview button, and make the deploy workflow take `workflow_dispatch` on the branch and tear the preview down on `pull_request: closed`, as workflow.md describes.

### 11. Check the setup

Check from a fresh clone, because your own clone may have files that a new one doesn't:

```sh
git clone <your repo> /tmp/check && cd /tmp/check
git ls-files --stage repo-defaults | head -1     # 100644 is a copy; 160000 is a submodule
ls repo-defaults/writing.md                       # the rules that CLAUDE.md imports
find -L .claude/skills .agents/skills -type l     # prints each broken skill link, so it should print nothing
claude -p "List the skills whose names start with principle-" < /dev/null
```

The last command should list the pstack principles. If it lists none, the skills were linked by an older repo-defaults: run the update script.

## Moving from a submodule

If `repo-defaults/` is a submodule, which `node repo-defaults/src/init.ts` reports, switch it to a copy. Commit or stash your changes first.

```sh
git submodule deinit -f repo-defaults
git rm -f repo-defaults
rm -rf .git/modules/repo-defaults
git commit -m "Remove the repo-defaults submodule"
git fetch --depth=1 https://github.com/frolic/repo-defaults main
git read-tree --prefix=repo-defaults/ -u FETCH_HEAD
node repo-defaults/src/update.ts
node repo-defaults/src/init.ts
```

Then remove `submodule.recurse` and `push.recurseSubmodules` from `.git/config` if you set them, drop `submodules: true` from each `actions/checkout` step, commit the links that init wrote, and check the setup as in step 11.
