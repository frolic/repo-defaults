# Decisions

Choices made in this repo, with the options considered and the reason for each. Newest first.

## The built JavaScript in `dist/` is committed

- **Options:** ship only TypeScript; build `dist/` in a `prepare` script when pnpm installs the git dependency; commit `dist/`.
- **Trade-offs:** Node runs TypeScript directly from a checkout, so a submodule needs no build. Node refuses to strip types from a file under `node_modules`, so a git dependency needs JavaScript. pnpm 11 runs a git dependency's `prepare` only if `allowBuilds` lists the package by its tarball URL, which changes with every commit, so each update would need a config change. A committed `dist/` can drift from its source.
- **Chosen:** commit `dist/`, built with `rewriteRelativeImportExtensions` so the `.ts` imports in `src/` become `.js`. `test/dist.test.ts` builds into a temporary directory and fails if the output differs from `dist/`.

## The oxlint rules use the `defaults/` prefix

- **Options:** keep `portable/`; `repo-defaults/`; `defaults/`.
- **Trade-offs:** `portable/` is wrong outside Portable, and `repo-defaults/` is long in every rule name and `oxlint-disable` comment.
- **Chosen:** `defaults/`. A repo that adds its own rules uses its own prefix, as Portable keeps `portable/error-kind` and `portable/no-private-symbol`.

## Portable's package rules stay in Portable

- **Options:** move every rule in Portable's AGENTS.md; move only the rules that don't mention packages, runtimes, or @portable/* packages.
- **Trade-offs:** the WinterTC API rules, the package layout, and the test layout only make sense in a repo of runtime-agnostic packages. The writing rules and the TypeScript style don't depend on what the repo builds.
- **Chosen:** writing.md takes the Writing section, and typescript.md takes the Code style section and the API conventions that don't depend on Portable's packages.
