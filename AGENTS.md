# repo-defaults agent guide

This repo holds the rules and tooling that other repos include as a git submodule at `repo-defaults/` or as a git dependency. Follow [writing.md](writing.md) and [typescript.md](typescript.md) here too. [README.md](README.md) shows how a repo includes each file. Log a choice the docs don't settle in [decisions.md](decisions.md).

## Commands

| Command | What it does |
| --- | --- |
| `pnpm check` | Format with oxfmt, lint with oxlint, and type-check, fixing what it can (`vp check --fix`). |
| `pnpm check:types` | `tsc -p tsconfig.json` over `src/` and `test/`. |
| `pnpm test` | The rule tests, the prose checks over this repo, and the `link-skills` test. |
| `pnpm build` | Builds `dist/` with `tsconfig.build.json`. Commit `dist/` with the change to `src/`, because a git dependency uses it. `test/dist.test.ts` fails when `dist/` doesn't match a fresh build. |

## Rules for this repo

- Every file here is used by other repos, so a change changes them all on their next update. Keep rules generic: a rule that only one repo needs goes in that repo's AGENTS.md.
- Keep each file usable from both a checkout and `node_modules`. Node runs the files in `src/` directly from a checkout, so relative imports in `src/` end in `.ts`, and `tsconfig.build.json` rewrites them to `.js` for `dist/`. Each module in `package.json` `exports` has a `src` condition for the checkout and `types` and `default` conditions for `dist/`.
- `src/oxlint.ts` has no relative imports, because oxlint loads it on its own.
- `src/` may use `node:*` modules. These files run in Node at development time and never in a host repo's published code.
- Don't edit `vendor/pstack/`. Its README says how to update it.
- When a rule in writing.md or typescript.md gets a check, name the check in the rule.
