---
name: walkthrough
description: Write a reviewer's walkthrough of a pull request, ordered by what matters instead of by file. Use when a PR is ready for review, or when someone asks to walk through a change.
---

# Walkthrough

Write a walkthrough that gets a reviewer to understand one pull request as fast as possible. Order it by what matters, not by file path.

Adapted from `pr-review-canvas` in [cursor/plugins](https://github.com/cursor/plugins/tree/main/pr-review-canvas) (MIT, Cursor). That version renders a Cursor Canvas. This one writes Markdown.

## Get the diff

Work from one pull request: a number or a URL. If none was given, ask for it. Don't guess from the current branch.

Read the PR with the GitHub MCP tools (`pull_request_read` for the files and the diff) or `git diff origin/main...<head>` on a checkout. Read the PR body and the commit messages too, because they hold the reasons.

## Order the changes

1. **Core logic.** New behaviour, changed rules, state changes, and changes to a public interface or a stored format. Show the hunks that matter, with enough context to read them.
2. **Wiring.** Routes, layers, config, and call sites that connect the core change. Condense these to what a reviewer needs to confirm they're right.
3. **Mechanical.** Renames, moved files, formatting, re-exports, and generated code. List the files with their line counts. Show no diff unless one matters.

Put the core logic first, while the reviewer's attention is fresh. A change to a stored format or a normative doc is always core logic, because it changes a format or a rule.

## Make hard parts easy to check

- **Pseudocode.** When a core hunk is dense (nested conditions, a state machine, a retry loop), add a few lines of pseudocode that show the control flow without the syntax and error handling. Skip it when the diff is easy to read.
- **A traced example.** When a change alters behaviour in a way that's hard to predict, pick one small realistic input and walk it through the old and the new code. Name the step where they differ and the result someone would see.
- **Callouts.** Mark something surprising or easy to miss with a short tag (**Subtle**, **Breaking**, **Race**, **Format**, **Perf**) and one sentence. Use them rarely, or they stop meaning anything.
- **A picture.** When a flow has three or more moving parts, a small mermaid diagram often beats prose. Use one only when it helps.

## Write it

Follow `writing.md`. Write for the reviewer, not as a changelog:

- Use plain words. Name a function or a file only where the reviewer needs it to find the code.
- Say why each part changed, not only what changed.
- Say how the files connect: "The new check in `validateOrder.ts` runs on the route added in `orderRoutes.ts`."
- Say what the diff alone doesn't show: a test that proves a claim, a caller outside the diff, a trade-off that was considered.

Keep each note to one or two sentences.

## Where it goes

Post the walkthrough as one comment on the pull request, ending with the attribution footer. If the PR already has a walkthrough comment, update it instead of adding a second one. A walkthrough longer than about 150 lines is a sign the PR should be split. Say so at the top.
