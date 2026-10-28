---
name: pr-review
description: Have a Fable agent review a change for design and correctness, then judge and fix what it finds. Use before a change is ready for review or before it merges, and again after a large change to it.
---

# Review a change

The agent that wrote a change does not review it alone. A second agent on Claude Fable reads the change with a fresh context. The reviewer is deliberately strict, so some findings are wrong or too small, and the author judges each finding before acting on it.

## Steps

1. Run the repository's own checks (format, lint, type check, tests). The review does not look for what these find.
2. Start one agent with the Agent tool and `model: "fable"`. Give it:
   - the repository path, the range of the change (such as `origin/main...HEAD`), and the pull request number if one exists
   - one or two sentences on what the change is for
   - the output of `git diff --stat` for the change, so that it reads the diff one package at a time, not as one large file
   - the text of the sections "What to look for", "What not to report", and "How to report" below
   - this instruction: "Read the code and report findings. Do not edit files, commit, or post to GitHub."
3. When the change adds or edits prose (docs, READMEs, JSDoc, comments, the commit message, or the pull request text), start a second agent in the same call, as "Prose pass" says.
4. Judge each finding as "Judge the findings" says. Then fix the findings you keep.
5. If the fixes changed the design, run the review again. Stop when no finding is left to fix, or after three rounds.
6. Put the findings you fixed in the commit message. In the pull request text, add a short "Review" section only for the findings that a person may want to overrule: the ones you dismissed or left open, one plain line each. Leave the section out when there are none.

## What to look for

Read the repository's `CLAUDE.md` (or `AGENTS.md`, or `.claude/rules/`), the repo-defaults rules it imports (`writing.md`, `typescript.md`, `principles.md`, and `workflow.md`), and the design docs it links to first. They state the rules and the words of the project. Read the whole change, then the code around it. Judge the resulting design, not only the lines that changed. Use the items below that fit the change, and skip the design review for a small fix. Do not question the goal of the change. Question how the change meets it.

Be ambitious. Do not stop at "this could be a bit cleaner". Look for a restructure that keeps the behaviour and deletes whole branches, flags, helpers, or layers. A refactor that moves complexity somewhere else without removing it is not a fix.

1. **Good, simple architecture.** If we designed this part again today, would it look like this? If a simpler design meets the goal, say so, even when it needs a refactor. Remove before you add: dead code, unused options, and guards for cases that cannot occur.
2. **No chains of workarounds.** A fix on top of a fix means the design is wrong. Find the root cause and fix it there. Flag these signs:
   - a new `if` for one caller, platform, or bug in a shared path
   - a second boolean that must stay in step with the first
   - a null check or try/catch that hides a crash instead of removing its cause
   - a workaround that needs a long comment to explain it

   When the code branches on the same question in many places, the cause is a missing model. Use a state machine, a discriminated union, or a lookup table so the branches go away.

3. **No new jargon.** A new term needs a strong reason and a clear definition in the docs. Prefer the project's existing words and common words. Flag a new name for a thing that already has a name.
4. **Simple names.** A name says what the caller gets. Use full words, not abbreviations. A name does not describe how the code works or where it came from.
5. **Boundaries that make removal easy.** Each part does one job behind a small interface. It must be possible to delete or replace a part and change only the code that calls it. Flag:
   - an import that goes the wrong way, or one part that knows the internals of another
   - feature logic in a shared module, or logic outside the layer that owns the concept
   - a near copy of a helper that the code base already has
   - a file that the change pushes past about 1000 lines
6. **Good interfaces.** An interface is small, hides real decisions, and is hard to use wrongly. It does not leak storage, transport, or wire types to the caller. Two paths that do the same job are a design problem. Remove a wrapper with one caller, an adapter with one implementation, and a layer that only passes calls through.
7. **Pure functions and clear data.** Prefer a function that takes its inputs and returns a value. Keep I/O, time, and randomness at the edges, and pass them in as arguments. Validate and parse outside data once, where it enters. Code past that point trusts the types and does not check again. Make wrong states impossible to build. Flag casts, `any`, and optional fields whose valid combinations need a comment.
8. **Correctness.** Look for bugs, races, data loss, state that an error can leave half updated, and security mistakes.
9. **Docs and tests.** A change that makes a doc or README wrong fixes it. A new rule or behaviour has a test that proves it. A test calls the code as a user does and checks a literal result. Flag a test that still passes when the code under test returns nothing.
10. **Comments.** Each comment in the code that the change touches is one that the Comments section of `typescript.md` allows. The prose pass checks how they read. Flag a comment that a name, a type, a smaller function, or a test could say instead, with the better shape. The ways are in the Comments section of `.claude/skills/codebase-review/SKILL.md`. Flag JSDoc that only repeats the name.
11. **One focus.** The pull request keeps one focus, as `workflow.md` says. Flag work with another focus, such as a rename in a docs sweep, and say which pull request it belongs in. Docs and comments that follow the change are part of it.

## What not to report

- Format, lint, and type errors. The checks in step 1 find them.
- A different approach that you prefer, when you cannot show a concrete problem with the current one.
- A case that no caller or input can reach. Read the callers and the types before you report it.
- A new abstraction for code that changes in only one way today.
- A problem that was in the code before this change, unless the change makes it worse.

## How to report

- Start with the number of findings of each kind, or with "No findings." A review with no findings is a good result. Do not add small items to fill the review.
- Give each finding a `file:line`. Start it with **Blocking** (a bug, a security problem, or a doc that is now wrong) or **Design** (items 1 to 7). Report at most three small items, marked **Small**.
- For each finding, give the evidence. For a bug, give the caller or input that causes it and the steps from there to the failure. For a Design finding, say what is wrong, what a simpler design is, and what it removes.
- If you think a finding is real but you cannot show the path, say so. Do not state a guess as a fact.
- Write by `writing.md`.

## Prose pass

The design reviewer reads prose last and only in passing, so a second agent reads nothing else. Start it with the Agent tool and `model: "fable"`, and give it:

- the base and head of the change, and the pull request number if one exists
- the whole of `writing.md`, with its table, and any writing rules the repository's own CLAUDE.md or AGENTS.md adds
- this instruction: "Read only the prose that the change adds or edits: docs, READMEs, JSDoc, comments, the commit messages, and the pull request title and body. Do not judge the code. For each sentence that matches a row of the table or breaks a rule above it, give the `file:line`, the sentence, the rule or row it breaks, and a rewrite in plain words. A rewrite keeps every fact and reason. Report at most twenty sentences, worst first, and say how many more there are. Do not edit files, commit, or post to GitHub."

Judge its findings like any other. Dismiss a rewrite that loses a fact or reads worse. When it finds a pattern that the table lacks, add a row to the table in `writing.md` and commit it to repo-defaults.

## Judge the findings

You are the lead reviewer. The findings are not a list of tasks. The reviewer saw only the code. You also know the goal, what was tried before, and what the next change will do. Put each finding in one of four groups:

- **Fix.** The finding shows a real path to a bug, or a structural problem that this change adds. Fix it in this change. When the refactor is too large for this change, say why in the Review section and open an issue. Do not add a workaround in its place.
- **Ask.** The answer changes a goal, a public format, or something that cannot be undone. Ask a person, and continue with the safe choice where you can.
- **Note.** The finding is true but small for this stage, or it is about code that this change does not touch. Write it in the Review section, or open an issue when it needs work later.
- **Dismiss.** The finding is wrong, depends on a case that cannot occur, or is a preference. Give the reason in one line.

Use these tests:

- **Trace it.** For "what if X is null" or "what if this runs twice", find the real caller. If the types or an earlier check prevent the case, dismiss the finding.
- **Weigh it.** Compare the code a fix adds with what it prevents. A guard for an unlikely case is the kind of workaround the review exists to stop. Do not add it.
- **Take it seriously** when the finding names a concrete path, when you read it and think "yes, that is right", or when it shows a gap in what you understood. Before you dismiss a security or correctness finding, trace it yourself.

If more than five findings are in Fix, judge them again, harder. If more than five are still in Fix, read the next section.

## When the structure is wrong

Some findings show that the design is wrong, not one line. Do not add another fix of the same kind.

1. If the same finding comes back after you fixed it, or two fixes in a row fail on the same problem, write down in one sentence what the fixes assumed. Check if that assumption is true.
2. Ask: "If we wrote this part today with this requirement from the start, what would we build?"
3. If the answer is not clear, sketch two or three different designs and compare them. Prefer the one that removes the most code and the most rules a reader must know.

The review rules adapt these pstack skills (github.com/cursor/plugins): `thermo-nuclear-code-quality-review`; the rubric and lead judgment of `interrogate`; and the `principle-*` skills, mostly `attack-the-premise`, `fix-root-causes`, `redesign-from-first-principles`, `exhaust-the-design-space`, and `subtract-before-you-add`.
