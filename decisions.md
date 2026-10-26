# Decisions

Choices made in this repo, with the options considered and the reason for each. Newest first.

## Other repos' skills are vendored with git subtree

- **Options:** copy the files by hand and record the commit; a git submodule per repo; git subtree.
- **Trade-offs:** a hand copy is slow to update and easy to get wrong. GitHub's tarballs leave out submodules, so a git dependency on this repo would install empty `vendor/` folders, and a host repo that uses this one as a submodule would need `--recursive` everywhere. git subtree stores the files as ordinary files, so both setups get them, and `git subtree pull` updates them. Splitting cursor/plugins down to `pstack/` keeps the other plugins in that repo out of this one.
- **Chosen:** git subtree with `--squash`, run by `pnpm vendor`, which also records each source and its upstream commit in `vendor.json`. Every skill in a source is vendored, and `link-skills` links only the ones in `vendor.json`'s `link` lists, plus any named on its command line, because each linked skill's description is loaded into every session.

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
