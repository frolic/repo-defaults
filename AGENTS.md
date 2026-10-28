# repo-defaults agent guide

This repo holds the rules and tooling that other repos include as a git submodule at `repo-defaults/` or as a git dependency. Follow [writing.md](writing.md), [typescript.md](typescript.md), [principles.md](principles.md), and [workflow.md](workflow.md) here too. [README.md](README.md) shows how a repo includes each file. Log a choice the docs don't settle in [decisions.md](decisions.md).

## Commands

| Command | What it does |
| --- | --- |
| `pnpm check` | Format with oxfmt, lint with oxlint, and type-check, fixing what it can (`vp check --fix`). |
| `pnpm check:types` | `tsc -p tsconfig.json` over `src/` and `test/`. |
| `pnpm test` | The rule tests, the prose checks over this repo, and the tests of `link-skills`, `pnpm vendor`, and `dist/`. |
| `pnpm vendor add <name> <repo>`, `pnpm vendor update [<name>]` | Vendors a repo into `vendor/<name>` with git subtree, or pulls the newest upstream commit (`scripts/vendor.ts`). |
| `pnpm build` | Builds `dist/` with `tsconfig.build.json`. Commit `dist/` with the change to `src/`, because a git dependency uses it. `test/dist.test.ts` fails when `dist/` doesn't match a fresh build. |

## Rules for this repo

- Every file here is used by other repos, so a change changes them all on their next update. Keep rules generic: a rule that only one repo needs goes in that repo's AGENTS.md.
- Keep each file usable from both a checkout and `node_modules`. Node runs the files in `src/` directly from a checkout, so relative imports in `src/` end in `.ts`, and `tsconfig.build.json` rewrites them to `.js` for `dist/`. Each module in `package.json` `exports` has a `src` condition for the checkout and `types` and `default` conditions for `dist/`.
- `src/oxlint.ts` has no relative imports, because oxlint loads it on its own.
- `src/` may use `node:*` modules. These files run in Node at development time and never in a host repo's published code.
- Don't edit the files under `vendor/<name>`. Change them upstream, or keep a changed copy in `skills/`, and update the source with `pnpm vendor update`.
- When a rule in writing.md or typescript.md gets a check, name the check in the rule.
- `test/publicInterface.txt` prints the names and types that other repos import from `src/`. A change to it is an interface change, so rewrite it with `pnpm test -u` only once the owner agrees.
- `hooks/` are POSIX shell scripts that call package scripts by their names in workflow.md, so they work in any repo. Put a repo's own commands in its package scripts, not in the hooks.
