# Workflow

How to work on a change in every repo that includes repo-defaults, for people and agents.

## Changes and pull requests

- A pull request keeps one focus, so a reviewer reads it in one mode and nothing gets buried. The usual kinds are a docs and comments sweep, a refactor (renames and moved files count), a new feature, and a migration (a dependency bump or a change in an external API). Work with another focus goes in its own pull request. Do a refactor first when it makes the feature easier, or after it to clean up. The docs and comments that a change makes wrong are part of that change.
- Commit and push early and often.
- Don't pass `--no-verify`. If a hook fails, fix what it found. In a repo that uses turbo, don't pass `--force` either, because it skips the cache and runs every task again.
- To review the whole tree and plan the next changes, run the `codebase-review` skill. It changes no code.
- To help a reviewer read a pull request, run the `walkthrough` skill.

## Review and done

- Before a pull request is ready for review, run the `pr-review` skill. Fresh agents that didn't write the change review it against its design and its brief, and the author judges each finding before fixing it.
- Done means a verdict, not a report. A change is done when an agent that wrote none of it runs the checks, and the flows the change touches, at the head commit, and writes `PASS` or `PASS with notes` with the evidence for each claim. A new push needs a new verdict. The last step of `pr-review` gets it.

## Decide upstream

The owner reads a short design, not the code, so the decisions that need the owner come before the code. A change that crosses an interface starts as a design in `docs/proposals/<slug>/`: what changes; the interface before and after, as code; and the options considered. It asks its questions in rounds, each with a recommended answer, and the code starts when the round is closed.

- Measure before you ask. Each option in a question has been tested, measured, or prototyped, and the question shows the data: which runtimes accept an input; how many requests and bytes a design costs at a named size; or what survives a reload. "This might work, but we haven't tried it" is not an option to offer. Link the prototype and what it measured, and mark a number you could only calculate as calculated. Often the experiment answers the question, and it never reaches the owner.
- Explain each option in plain words. Define each term the owner may not know, or use a plainer one.
- Every other call is the agent's own, recorded as a ruling: what it decided, why, and what it costs if wrong. The proposal keeps the rulings, so the owner can reverse one later without having been asked.

## What needs the owner

| Kind | What it is | What the question shows |
| --- | --- | --- |
| Interface change | A public name, signature, type, key layout, route, or promise is added, changed, or removed, and so is a performance budget that goes up. Public means what other packages, apps, or repos import or call. | The interface before and after, as code. Why. What it costs callers now and what it buys later. Two or three options, and why this one. |
| Trapdoor | A decision that stored data or other parties will depend on, so it is hard to undo, such as a frozen format, a schema, or a key layout. | The cases it solves and the cases it doesn't. What changing it later would take. |
| Taste or scope | A finding that needs judgment, such as two goals in tension, a flow that feels wrong, or a new kind of work. | What was found, the options, and a recommendation. |

To make an interface change fail a test until the owner agrees, print the exports of the public entries with `publicInterface` from `src/publicInterface.ts` and compare them with a committed file. A diff of that file is the diff of the interface, and only the owner's agreement allows rewriting it. A change to a repo's goals or architecture docs is an interface change at the level above. A refactor behind an interface whose tests pass is not, and neither is a review finding the author can fix.

- A question fits on one screen. It leads with the decision and a recommendation, and the owner can answer it without reading the code. If you aren't sure whether to ask, ask yourself whether the owner would be surprised to find it later.
- Only the owner closes a question. Record the decision in the proposal with the owner's words, quoted, and a link to the message. A question without an answer stays open, and the work continues on the recommended option where that can be undone.
- An approval covers only what it names. "Sounds fine" to a summary isn't a yes to each recommendation in it, so ask about each one that needs the owner.

## Checks and CI

CI minutes cost money, so each check runs as early and as narrowly as it can, and CI runs only once a change is on its way into `main`.

| When | What runs | Package script |
| --- | --- | --- |
| While you change code | The tests that cover the code you changed, including its end-to-end tests, picked by file or test name | your test runner with a filter, such as `pnpm vitest run src/feed` |
| Each commit (pre-commit hook) | Format and lint the staged files, fixing what it can | `check:staged` |
| Each push (pre-push hook) | Check that the lockfile matches each package.json, then format check, lint, and type-check the whole repo, then run the tests the diff from `origin/main` affects | `check`, then `test:changed` |
| Push to `main`, and the merge queue | Every check and the default test suite | `check`, then `test` |
| Before a release | The full suite, including slow, browser, fuzz, and end-to-end tests that `test` leaves out | `test:full` |

- Run end-to-end tests locally when a change can break them, but run only the ones that cover what changed, not the whole end-to-end suite.
- Never start a CI run on a branch or a pull request to check it, and never re-run a CI job to see if it passes. Run the check locally instead.
- `test` stays fast enough to run on every push to `main`. A slow test, such as a fuzz run with many cases, a benchmark, or a scale test, goes in `test:full`, or in its own script that you run when you work on that area.
- The git hooks in `repo-defaults/hooks/` run these scripts, and skip a script the repo doesn't have. `templates/github/workflows/` holds a Checks workflow for `main` and the merge queue, and a Full suite workflow to run by hand or from a release workflow.

## Dependencies

- Every dependency names an exact version, such as `4.0.2`, and so does every entry of a pnpm catalog, so an install never picks up a release that nobody chose. Only a peer dependency is a range, because it says what the package works with. A test that runs `versionRanges` from `src/versionRanges.ts` checks this.
- pnpm refuses a version published less than 14 days ago (`minimumReleaseAge: 20160` in pnpm-workspace.yaml, as in `templates/pnpm/pnpm-workspace.yaml`), so a hijacked release is found and pulled first. `minimumReleaseAge` from `src/minimumReleaseAge.ts` reads the setting for a test.

## Corrections and retro

A correction the owner has to give twice is a gap in the process, not in the agent, and a check closes it.

- When the owner corrects an agent, the agent adds a row to `.claude/corrections.md` in the same turn, or raises the count of the row it repeats. Start the file from `templates/claude/corrections.md`.
- A correction given twice becomes a check that fails. Fix it at the highest level that works: the design, then a type, then a lint rule, a hook, or a test, and last a line in a doc, because nothing fails when an agent skips a doc line. The row names the check, and a test that runs `unenforcedCorrections` from `src/unenforcedCorrections.ts` on the log fails while a row seen twice names none.
- The repo's CLAUDE.md or AGENTS.md keeps a table of its rules, with two columns: the rule, and what enforces it. A rule in the table isn't repeated elsewhere in the file. A rule that only review enforces says "review", and one that nothing enforces yet says "nothing yet".
- Run the `retro` skill once a day from a scheduled task, or after a long piece of work. It reads the day's threads, commits, and verdicts, logs the corrections nobody logged, and turns each repeat into a check.

## Agent work

Each model call reads the whole context of a thread again, so the cost of a step grows with the length of the thread. These rules keep the context small.

- A thread stays on one topic. When the work moves to a different topic, say so and ask for a new thread with a short brief.
- A subagent returns at most 15 lines: the verdict, the blocking findings, and a link. A longer report goes in a file.
- An agent that fixes review findings fixes only those findings. It reports any other change it thinks is needed, and doesn't make it.
- Run a command that waits, such as a long test run, a deploy, or CI, in the background, and act on its notice when it ends. A loop that sleeps until a condition holds blocks other work and the person's messages.
- Read large files by section: find the headings with `grep -n '^#'`, then read one section. Limit the output of a search.
- Edit files with the Edit tool, not with `python` or `sed` scripts. The hook in `templates/claude/settings.json` (`src/refuseInPlaceEdits.ts`) refuses `sed -i`, `perl -i`, and a script that writes files.
- Pass the full 40-character SHA to a merge call.
- Before a long CPU job, run it on a sample and say the expected time.

### Units of work

A proposal lists its units, each marked pending or done. Each unit is one pull request and runs in a fresh agent, so the thread that coordinates them holds only the plan and the verdicts. The kickoff of a unit names three things: the proof of done (the tests, flows, or measurements that must pass), the files it may write, and the actions it must not take. It points to files instead of copying them, so the agent starts with a small context. The coordinator judges a unit by its diff and its verdict, not by the summary the agent returns. Start with one unit before you run several at once.

An experiment shows what is possible, how it performs, or how it feels, and isn't meant to merge. Its pull request carries the `experiment` label and stays a draft. What it found goes in a doc, reviews skip its code, and a change that wants its idea starts again from that doc, as a unit that is meant to merge.
