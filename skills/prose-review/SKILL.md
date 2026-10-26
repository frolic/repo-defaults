---
name: prose-review
description: "Use for \"prose review\", \"review the writing\", or before finishing a change that adds or edits docs, READMEs, JSDoc, comments, commit messages, or a PR title or body. A second agent checks the new prose against writing.md from repo-defaults."
---

# Prose review

A separate reviewer agent reads the prose a change adds or edits and checks it against `writing.md` from repo-defaults, which the repo includes at `repo-defaults/writing.md` or `node_modules/repo-defaults/writing.md`. It edits no files, and it reads code only to find the actor in a comment. The author decides which rewrites to take.

## Step 1, Collect the prose

Diff the change against its base branch, which is `main` unless the change targets another branch, and include uncommitted edits: run `git diff main...HEAD` and `git diff`. Keep only the added or edited lines that are prose:

- Markdown files, such as `docs/*.md`, `AGENTS.md`, and READMEs. Skip tables generated between `<!-- ...:start -->` and `<!-- ...:end -->` markers.
- JSDoc and `//` comments in `.ts` files. Skip the code and `@example` code.
- The commit messages on the branch (`git log main..HEAD`) and the PR title and body, if they exist.

Label each passage with its `file:line`, or `commit <sha>` or `PR body` for text outside the tree. If nothing is left, report that there is no prose to review and stop.

## Step 2, Spawn the reviewer

Spawn one reviewer agent with read-only instructions. Give it the whole of `writing.md`, including the table, and any writing rules the repo's own `AGENTS.md` adds, then the prose from step 1, then this instruction verbatim:

> For each sentence that matches a row of the table or breaks a rule above it, give the file:line; the sentence; the rule or row it breaks; and a rewrite in plain words. A rewrite keeps every fact and reason. Report at most twenty sentences, worst first. Do not edit files.

Then add this instruction, because without it a reviewer swaps words and keeps the shape of the sentence:

> Check the structure of each sentence before its words. When the actor matters and the sentence hides it, make the actor the subject. A passive such as "is treated as body content" is fine when the actor is obvious. Then look for clauses in an unnatural order, such as "a CR that no LF follows", and rewrite them the way a person would say them: "a CR without a following LF". A rewrite that keeps the original sentence's shape and only replaces words is not a fix. Read the code around a comment when you need it to find the actor, but review only the prose.

Then add this one, because the made-up actor is the pattern reviews have missed most often:

> Flag every sentence built around a made-up actor, such as "an app that supports older browsers adds its own" or "a caller who wants a few tries writes a counter", including in commit messages and the PR title and body. Rewrite it to talk to the reader ("if you support older browsers, add them yourself") or to name the real thing that acts.

Don't paste the code or the rest of the diff into the prompt. The reviewer opens the code around a comment only to find the actor, so it still reads the prose as a reader of the docs does and notices a sentence that only makes sense if you know the code.

## Step 3, Apply

Read each finding. Dismiss a rewrite that drops a fact or a reason or that reads worse than the original. When a rewrite keeps the original sentence's shape and only swaps words, write the sentence again from scratch. Apply the rest.

When a finding shows a pattern that no row of the table covers, add a row to the table in `writing.md` with the original sentence and the rewrite, and commit it to repo-defaults.

Report which findings you applied, which you dismissed and why, and the rows you added.
