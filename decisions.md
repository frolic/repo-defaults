# Decisions

Choices made in this repo, with the options considered and the reason for each. Newest first.

## A repo commits a copy of repo-defaults, not a submodule

- **Options:** keep the submodule and fetch it in a cloud environment's setup script; keep it and fetch it from a Claude Code session hook in the repo; a git subtree; a plain copy that an update replaces; the git dependency.
- **Trade-offs:** a submodule is empty in a plain clone. A cloud agent session clones each repo without its submodules and starts Claude Code in the folder above the repos, so the repo's own session hooks never run there. With an empty folder, the `@repo-defaults/*.md` imports in CLAUDE.md load nothing and every skill link is broken. Measured with probe repos and `claude -p`: when a session hook fills the folder, the skills load but the imports don't, because Claude Code reads CLAUDE.md before the hook runs. A setup script works, but each person and each environment has to add it. The git dependency has the same gap until `pnpm install` runs. `git subtree pull --squash` fails with "was never added" after a squash merge or in a shallow clone, because it reads metadata from the commit that added the subtree. A plain copy needs no history: the update deletes the folder and reads the new tree into it. The whole of repo-defaults is about 8 MB, almost all of it the vendored repos' docs, images, and test fixtures.
- **Chosen:** the plain copy. `src/update.ts` replaces it with the newest `main` and links the skills again in one commit, init adds it as the `repo-defaults:update` script and reports a submodule, and SETUP.md says how to move off one. The copy holds only the files that package.json `files` lists, the same ones a git dependency installs, which is about 1.4 MB. It leaves out `dist/`, which only a git dependency runs: many repos ignore `dist/`, and lint-staged failed to stage the copy's `dist/` files again in a repo that ignores it. One list then decides what both kinds of host get, and `files` already uses the patterns npm and pnpm read. Look at this again if Claude Code starts running a repo's hooks or fetching submodules before it reads CLAUDE.md.

## link-skills writes a folder without the slash-command flag for each skill that sets it

- **Options:** link the vendored skills as they are; edit the flag in `vendor/`; install the Claude Code port of pstack, which drops the flag; keep copies without the flag in this repo and link those; write the copy in the host repo when linking.
- **Trade-offs:** pstack sets `disable-model-invocation: true` on every skill, so Claude Code leaves the skill out of the list the agent picks from, and a linked pstack skill runs only when a person types its name. Measured: of two otherwise identical skills, an agent listed only the one without the flag. An edit in `vendor/` conflicts with each update. The port routes every task through its own poteto-mode, whose rules on asking before acting differ from ours, and it is weeks behind upstream pstack. Copies kept here need a staleness test, and their links to `vendor/` are dropped from the tarball that pnpm installs for the git dependency. A folder written in the host repo has none of these problems, and costs one small SKILL.md for each linked skill.
- **Chosen:** for a skill with the flag, link-skills writes a folder in the host repo with the SKILL.md minus that line, a link to each of the skill's other files, and a `.link-skills` marker, so the next run replaces it and a skill the repo keeps as its own folder is left alone. The folder is written under `.agents/skills/`, and `.claude/skills/` links to it: a host's pre-commit formatter rewrote the frontmatter of a folder written under `.claude/`, so each later run changed it back, and the `fmt` settings already ignore `.agents/`. link-skills also deletes a link into repo-defaults whose skill is gone. With this change, each linked pstack skill's description is loaded into every session, as the entry on vendoring says. The principles that host docs restate are linked too: attack the premise, exhaust the design space, never block on the human, and outcome-oriented execution.

## oxfmt formats Markdown and package.json, and doesn't sort package.json

- **Options:** leave Markdown and package.json unformatted; format both with oxfmt's default, which sorts the keys of package.json; format both with `sortPackageJson: false`.
- **Trade-offs:** formatted Markdown keeps tables aligned, which matters in a repo whose docs are mostly tables. zile publishes only the package.json fields after its `[!start-pkg]` key. oxfmt's sort moves that key to the end, so zile would publish no fields at all, and oxfmt has no option to sort only on each side of a key: `sortPackageJson` takes only `sortScripts`.
- **Chosen:** format both, with `sortPackageJson: false`. Keys stay in the order they were written, and oxfmt still fixes indentation and line breaks. `test/fmt.test.ts` runs oxfmt with these settings on a zile package.json and on Markdown.

## CI runs only on `main` and in the merge queue

- **Options:** run every check on each pull request; run checks in git hooks and CI only on `main` and the merge queue; no CI at all.
- **Trade-offs:** CI minutes cost money, and an agent that pushes often can start dozens of runs a day on its branches. The pre-commit and pre-push hooks catch most failures before a push, on the machine that made the change, but they test only what the diff affects. A merge queue runs the default suite before a change reaches `main`, so `main` stays green without a run per push. The full suite, with slow and end-to-end tests, takes too long for every merge.
- **Chosen:** hooks run `check:staged` on commit and `check` and `test:changed` on push. CI runs `check` and `test` on `main`, in the merge queue, and by hand, and `test:full` runs by hand or before a release. The hooks call package scripts instead of commands, so each repo picks its own tools. `templates/claude/settings.json` denies starting or re-running a CI job and passing `--no-verify`.

## Pull request previews are deployed only by hand

- **Options:** deploy a preview on each push to a pull request; deploy one when a person starts the deploy workflow on the branch; no previews.
- **Trade-offs:** a preview on each push costs a deploy and CI minutes for every push, and most pushes from an agent are never looked at. A preview by hand costs a click, and the workflow has to find the pull request from the branch, because `workflow_dispatch` doesn't carry a pull request number. Either way, the preview's stage has to be torn down when the pull request closes.
- **Chosen:** the deploy workflow takes `workflow_dispatch` on the pull request's branch and deploys to the open pull request's `pr-<number>` stage, and the same workflow tears it down on `pull_request: closed`. `templates/github/pr-buttons.yml` defines a button for it that the GitHub PR Buttons extension shows on the pull request page.

## Semicolons, 100 columns, and annotations on empty collections

- **Options:** semicolons and a 100-column width, or no semicolons and 120 columns; let `prefer-satisfies` allow an annotation on an empty collection (`const chunks: Uint8Array[] = []`), or require a type argument (`new Array<Change>()`) with no exceptions; one tsconfig preset with `nodenext`, or a second one for bundlers.
- **Trade-offs:** the two repos these rules came from split on each of these. The newer conventions are the ones with semicolons, 100 columns, the annotation exceptions, and `nodenext`, and the other repo is moving to them.
- **Chosen:** semicolons, 100 columns, the exceptions in `prefer-satisfies`, and the one `nodenext` preset. A repo can still override `fmt.semi` and `fmt.printWidth` after spreading `fmt`.

## Other repos' skills are vendored as a copy that a script replaces

- **Options:** copy the files by hand and record the commit; a git submodule per repo; git subtree; a script that replaces the copy.
- **Trade-offs:** a hand copy is slow to update and easy to get wrong. GitHub's tarballs leave out submodules, so a git dependency on this repo would install empty `vendor/` folders, and a host repo that copies this one would get empty folders too. git subtree stores ordinary files, but `git subtree pull --squash` reads the commit that added the subtree, and a squash merge of the pull request that updates it leaves no such commit, so the next pull fails or conflicts. Copying only cursor/plugins' `pstack/` keeps the other plugins in that repo out of this one.
- **Chosen:** `pnpm vendor` fetches the upstream commit, replaces `vendor/<name>` with its tree, or with one directory of it, and records the source and the commit in `vendor.json`, in one commit. It reads no history, so squash merges are safe. Every skill in a source is vendored, and `link-skills` links only the ones in `vendor.json`'s `link` lists, plus any named on its command line, because each linked skill's description is loaded into every session.

## The built JavaScript in `dist/` is committed

- **Options:** ship only TypeScript; build `dist/` in a `prepare` script when pnpm installs the git dependency; commit `dist/`.
- **Trade-offs:** Node runs TypeScript directly from a checkout, so a submodule needs no build. Node refuses to strip types from a file under `node_modules`, so a git dependency needs JavaScript. pnpm 11 runs a git dependency's `prepare` only if `allowBuilds` lists the package by its tarball URL, which changes with every commit, so each update would need a config change. A committed `dist/` can drift from its source.
- **Chosen:** commit `dist/`, built with `rewriteRelativeImportExtensions` so the `.ts` imports in `src/` become `.js`. `test/dist.test.ts` builds into a temporary directory and fails if the output differs from `dist/`.

## The oxlint rules use the `defaults/` prefix

- **Options:** `repo-defaults/`; `defaults/`.
- **Trade-offs:** `repo-defaults/` is long in every rule name and `oxlint-disable` comment.
- **Chosen:** `defaults/`. A repo that adds its own rules uses its own prefix.

## Only rules that don't depend on what a repo builds are here

- **Options:** include rules about a repo's packages, runtimes, and test layout; include only rules that any TypeScript repo can follow.
- **Trade-offs:** rules such as "use only the WinterTC API" or "each entry point is a file in `src/exports/`" only make sense in one kind of repo. Writing rules and TypeScript style don't depend on what the repo builds.
- **Chosen:** writing.md and typescript.md hold only the general rules. A repo keeps its own rules in its AGENTS.md.
