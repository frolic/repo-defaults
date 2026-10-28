# Workflow

How to work on a change in every repo that includes repo-defaults, for people and agents.

## Changes and pull requests

- A pull request keeps one focus, so a reviewer reads it in one mode and nothing gets buried. The usual kinds are a docs and comments sweep, a refactor (renames and moved files count), a new feature, and a migration (a dependency bump or a change in an external API). Work with another focus goes in its own pull request. Do a refactor first when it makes the feature easier, or after it to clean up. The docs and comments that a change makes wrong are part of that change.
- Commit and push early and often.
- Don't pass `--no-verify`. If a hook fails, fix what it found.
- Before a pull request is ready for review, run the `pr-review` skill. A second agent that didn't write the change reviews it, and the author judges each finding before fixing it.
- To review the whole tree and plan the next changes, run the `codebase-review` skill. It changes no code.
- To help a reviewer read a pull request, run the `walkthrough` skill.

## Checks and CI

CI minutes cost money, so each check runs as early and as narrowly as it can, and CI runs only once a change is on its way into `main`.

| When                                | What runs                                                                                                                                                         | Package script                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| While you change code               | The tests that cover the code you changed, including its end-to-end tests, picked by file or test name                                                            | your test runner with a filter, such as `pnpm vitest run src/feed` |
| Each commit (pre-commit hook)       | Format and lint the staged files, fixing what it can                                                                                                              | `check:staged`                                                     |
| Each push (pre-push hook)           | Check that the lockfile matches each package.json, then format check, lint, and type-check the whole repo, then run the tests the diff from `origin/main` affects | `check`, then `test:changed`                                       |
| Push to `main`, and the merge queue | Every check and the default test suite                                                                                                                            | `check`, then `test`                                               |
| Before a release                    | The full suite, including slow, browser, fuzz, and end-to-end tests that `test` leaves out                                                                        | `test:full`                                                        |

- Run end-to-end tests locally when a change can break them, but run only the ones that cover what changed, not the whole end-to-end suite.
- Never start a CI run on a branch or a pull request to check it, and never re-run a CI job to see if it passes. Run the check locally instead.
- `test` stays fast enough to run on every push to `main`. A slow test, such as a fuzz run with many cases, a benchmark, or a scale test, goes in `test:full`, or in its own script that you run when you work on that area.
- The git hooks in `repo-defaults/hooks/` run these scripts, and skip a script the repo doesn't have. `templates/github/workflows/` holds a Checks workflow for `main` and the merge queue, and a Full suite workflow to run by hand or from a release workflow.

## Agent work

Each model call reads the whole context of a thread again, so the cost of a step grows with the length of the thread. These rules keep the context small.

- A thread stays on one topic. When the work moves to a different topic, say so and ask for a new thread with a short brief.
- In a thread that builds several pull requests, a subagent builds each one, so the thread holds only the plan and the results. A plan that the thread agrees on goes to `docs/proposals/` first.
- A subagent returns at most 15 lines: the verdict, the blocking findings, and a link. A longer report goes in a file.
- An agent that fixes review findings fixes only those findings. It reports any other change it thinks is needed, and doesn't make it.
- Before code adds a new public name, key layout, or route, ask the owner to choose from two or three options.
- Run a command that waits, such as a long test run, a deploy, or CI, in the background, and act on its notice when it ends. A loop that sleeps until a condition holds blocks other work and the person's messages.
- Read large files by section: find the headings with `grep -n '^#'`, then read one section. Limit the output of a search.
- Edit files with the Edit tool, not with `python` or `sed` scripts.
- Pass the full 40-character SHA to a merge call.
- Before a long CPU job, run it on a sample and say the expected time.
