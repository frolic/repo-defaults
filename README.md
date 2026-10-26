# repo-defaults

Writing rules, TypeScript style, config, checks, and agent skills to share across repos.

Include it as a git submodule at `repo-defaults/` or as a git dependency. Neither needs a build step, and nothing is published to npm yet. To set up a repo, add it, run `node repo-defaults/src/init.ts`, and ask your agent to run the `setup-repo-defaults` skill. [SETUP.md](SETUP.md) has the details.

## What's inside

**Rules for agents and people**

- [writing.md](writing.md): docs, comments, commit messages, and PR text, with a table of sentences to avoid.
- [typescript.md](typescript.md): TypeScript style, API shape, comments, and file names.
- [principles.md](principles.md): how to design a change.
- [workflow.md](workflow.md): pull requests, commits, and agent work.

**Config**

- `tsconfig/strict.json`: strict compiler options.
- `tsconfig/library.json`: `strict.json` plus declaration output, for a published library.
- `src/oxc.ts`: `fmt` and `lint` settings for `vite.config.ts`.
- `src/oxlint.ts`: five lint rules under `defaults/`: `import-extension`, `no-enum`, `optional-undefined`, `prefer-satisfies`, and `type-parameter-name`.

**Checks and commands**

- `src/prose.ts`: finds a made-up actor, a missing serial comma, ruled-out words, and a package name in a code span, and counts a doc's words for a length cap.
- `check-commit-message`: runs two of those checks on a commit message.
- `link-skills`: links skills and agents into `.claude/` and `.agents/`.
- `init-repo-defaults`: does the setup steps that need no judgment.

**Skills**

- `skills/`: `setup-repo-defaults`, `prose-review`, `pr-review`, `codebase-review`, and `walkthrough`.
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
