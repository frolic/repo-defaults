# repo-defaults

Writing rules, TypeScript style, config, checks, and agent skills to share across repos.

Include it as a git submodule at `repo-defaults/` or as a git dependency. Neither needs a build step, and nothing is published to npm yet. To set up a repo, add it, run `node repo-defaults/src/init.ts`, and ask your agent to run the `setup-repo-defaults` skill. [SETUP.md](SETUP.md) has the details.

## What's inside

**Rules for agents and people**

- [writing.md](writing.md): docs, comments, commit messages, and PR text, with a table of sentences to avoid.
- [typescript.md](typescript.md): TypeScript style, API shape, comments, and file names.
- [principles.md](principles.md): how to design a change.
- [workflow.md](workflow.md): pull requests and their review, what needs the owner, which check runs where, the corrections log, and agent work.

**Config**

- `tsconfig/strict.json`: strict compiler options.
- `tsconfig/library.json`: `strict.json` plus declaration output, for a published library.
- `src/oxc.ts`: `fmt` and `lint` settings for `vite.config.ts`.
- `src/oxlint.ts`: seven lint rules under `defaults/`: `boolean-name`, `import-extension`, `no-enum`, `one-export-per-file`, `optional-undefined`, `prefer-satisfies`, and `type-parameter-name`.

**Checks and commands**

- `src/prose.ts`: finds a made-up actor, a missing serial comma, ruled-out words, a package name in a code span, and a goal named by an id, and counts a doc's words for its word budget.
- `check-commit-message`: runs two of those checks on a commit message.
- `src/unenforcedCorrections.ts`: finds a correction in the log that was given twice and has no check yet.
- `src/publicInterface.ts`: prints the exports of a package's entries through the TypeScript compiler, for a test that fails when the public interface changes.
- `src/versionRanges.ts` and `src/minimumReleaseAge.ts`: find a dependency that names a range instead of an exact version, and read the release age that pnpm enforces.
- `src/propertySeed.ts`: the fixed seed for property tests, which `PROPERTY_SEED` changes.
- `src/unusedDependencies.ts` and `src/unusedEntryNames.ts`: find a dependency that a workspace package doesn't use, and an exported name that nothing uses.
- `link-skills`: links skills and agents into `.claude/` and `.agents/`.
- `init-repo-defaults`: does the setup steps that need no judgment.
- `hooks/`: pre-commit, pre-push, and commit-msg hooks that run a repo's `check:staged`, `check`, and `test:changed` scripts.

**Templates**

- `templates/github/workflows/`: a Checks workflow for `main` and the merge queue, and a Full suite workflow for releases.
- `templates/claude/settings.json`: stops Claude Code from starting CI runs and from skipping hooks, and refuses a shell command that edits files in place (`src/refuseInPlaceEdits.ts`).
- `templates/claude/corrections.md`: the log of the owner's corrections that the `retro` skill turns into checks.
- `templates/pnpm/pnpm-workspace.yaml`: refuses a package version younger than 14 days.

**Skills**

- `skills/`: `setup-repo-defaults`, `prose-review`, `pr-review`, `codebase-review`, `walkthrough`, and `retro`.
- `vendor/`: whole skill sets from [pstack](https://github.com/cursor/plugins/tree/main/pstack), [Matt Pocock](https://github.com/mattpocock/skills), and [HumanLayer](https://github.com/humanlayer/skills), copied unchanged with git subtree.
- `vendor.json`: where each set comes from, its upstream commit, and the skills linked by default.

## Change the defaults

With the submodule:

1. Run `git switch main` inside `repo-defaults/`, because a submodule checks out a commit, not a branch.
2. Edit, and try the change in your repo.
3. Commit and push in `repo-defaults/`.
4. Commit the new pointer in your repo with `git add repo-defaults`.

With the git dependency, push the change here and run `pnpm update repo-defaults` in your repo.

## Vendor skills

```sh
pnpm vendor add <name> <repo-url>          # whole repo
pnpm vendor add <name> <repo-url> --path <dir>  # one directory
pnpm vendor update                          # every source
pnpm vendor update <name>                   # one source
```

Each command is one squashed git subtree commit, and records the source and its commit in `vendor.json`. Run it with a clean working tree. `add` takes `--ref` for a branch other than `main`.

To link a vendored skill by default, add its path to that source's `link.skills` in `vendor.json`. Don't edit files under `vendor/<name>`, so each update applies cleanly.

## Development

```sh
pnpm install
pnpm test
pnpm check
pnpm check:types
```

Node 24 or later runs the TypeScript files directly. [AGENTS.md](AGENTS.md) describes the layout.

## License

MIT. Each repo in `vendor/` keeps its own license.
