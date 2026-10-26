---
name: setup-repo-defaults
description: Set up a repo to use repo-defaults, or check that a repo's setup is complete. Use when someone asks to set up, add, or adopt repo-defaults, or after repo-defaults is added as a submodule or a git dependency.
---

# Set up repo-defaults

repo-defaults holds shared rules, config, checks, and skills. This skill wires them into the repo in the current directory. `SETUP.md` in repo-defaults lists every step by hand. This skill runs the steps that need no judgment with one command, then does the merges that do.

## Step 1, Add repo-defaults

If neither `repo-defaults/` nor `node_modules/repo-defaults` exists, ask which way to add it. Recommend the submodule, because edits to it can be tried in the repo right away:

```sh
git submodule add https://github.com/frolic/repo-defaults repo-defaults
git config submodule.recurse true
git config push.recurseSubmodules on-demand
```

## Step 2, Run init

Run `node repo-defaults/src/init.ts` from the repo root, or `pnpm exec init-repo-defaults` for the git dependency. It updates CLAUDE.md and AGENTS.md, links the skills, writes a commit-msg hook if the repo has none, and creates a tsconfig.json if the repo has none. It prints what it did and what is left. Do each item it lists as left, as the steps below describe.

## Step 3, Merge the config

- **Format and lint.** If the repo has `vite.config.ts`, import `fmt` and `lint` from repo-defaults (`./repo-defaults/src/oxc.ts` or `repo-defaults/oxc`) and spread them under the repo's own settings, as `SETUP.md` shows. If the repo uses `.oxlintrc.json` and `.oxfmtrc.json` instead, copy the values from `src/oxc.ts` into them, and add the plugin path from `lint.jsPlugins`. Keep the repo's own rules and overrides after the shared ones, so they win.
- **tsconfig.** Make the repo's base tsconfig extend the strict preset, and keep the repo's own `target`, `lib`, `module`, and `moduleResolution`. Remove each option the preset already sets to the same value.
- **Hooks.** If the repo already has a commit-msg hook, add the command that init printed to it.
- **Prose test.** Add a test that runs `check` from `src/prose.ts` over the repo's Markdown and source, as `SETUP.md` shows. Skip `repo-defaults/`, `vendor/`, and generated files.
- **CI.** For the submodule, add `submodules: true` to each `actions/checkout` step. Don't start a CI run to try it.

## Step 4, Find the conflicts

Read the repo's CLAUDE.md, AGENTS.md, and contributing docs, and compare each rule with the repo-defaults rule files. For each difference, decide which kind it is:

- **Repeat.** The repo states a rule that repo-defaults now holds. Delete it from the repo's file, because the import loads it.
- **Repo-specific.** The rule only makes sense in this repo. Keep it.
- **Conflict.** The two disagree, such as on semicolons or line width. Don't pick one. List it for the person.

Then run the repo's format, lint, type check, and tests. A new lint finding is expected where the shared rules are stricter. Count the findings for each rule, and fix them only if the person asks, because the fixes can touch many files.

## Step 5, Report

Reply with what was set up, the conflicts with a recommendation for each, and the count of new lint findings for each rule. Commit the setup as one change, separate from any lint fixes.
