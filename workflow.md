# Workflow

How to work on a change in every repo that includes repo-defaults, for people and agents.

## Changes and pull requests

- A pull request keeps one focus, so a reviewer reads it in one mode and nothing gets buried. The usual kinds are a docs and comments sweep, a refactor (renames and moved files count), a new feature, and a migration (a dependency bump or a change in an external API). Work with another focus goes in its own pull request. Do a refactor first when it makes the feature easier, or after it to clean up. The docs and comments that a change makes wrong are part of that change.
- Commit and push early and often. While you change code, run only the tests that prove the work, such as the tests of the package it touches. When a pull request is ready for review, run the whole suite once.
- Don't pass `--no-verify`. If a hook fails, fix what it found.
- Before a pull request is ready for review, run the `pr-review` skill. A second agent that didn't write the change reviews it, and the author judges each finding before fixing it.
- To review the whole tree and plan the next changes, run the `codebase-review` skill. It changes no code.
- To help a reviewer read a pull request, run the `walkthrough` skill.

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
