---
name: codebase-review
description: Review the whole codebase with parallel agents, data first, and write one plan of pieces, defects, deletions, and ordered pull requests that move it toward done. Use for a periodic deep review, not for one change.
---

# Review the codebase toward done

The goal is a finished codebase: a set of pieces that fit together, stacked on each other or next to each other. Each piece has one role, a clear reason to exist, a small interface, and clear boundaries. Each piece is written as well as it can be with the tools the project chose. The code is plain enough to need almost no comments, and each feature is easy to delete.

This skill reviews the whole tree, not one change. For one change, use the `pr-review` skill.

The output is one plan and a short reply. Do not edit code, commit, or open a pull request in this skill. The person picks what to start.

## Principles

The reviewers use the text of the sections "What to look for", "What not to report", and "How to report" in `.claude/skills/pr-review/SKILL.md`. A whole-tree review adds these:

- **Data first.** Fred Brooks: "Show me your tables, and I won't usually need your flowcharts." Start each piece from its records, its state as one type, its tables or keys, and the events that change it. The functions follow from the data.
- **Requirements come from the apps.** What the apps build, work around, or copy shows what the store must do.
- **Design it again first.** Each reviewer sketches the design it would build today for its area, then compares the code with that sketch.
- **Illegal states cannot be built.** A union is a tagged union. No optional field, flag, sentinel, or string that code parses back represents a state.
- **One owner for each state.** Each piece of state has exactly one owner.
- **Boundaries.** Where the words of one piece appear inside another, the overlap is either inherent (the two pieces implement one rule, and the docs say so) or accidental (the rule is in the wrong piece and moves).
- **No old path beside the new one.** A change moves the callers, then deletes the old path.
- **Small verifiable units.** Each pull request in the plan ends in a state that its checks prove.
- **Rules in structure.** A rule that a comment or a doc repeats becomes a type, a lint, or a test.
- **No comments that code can say.** See "Comments" below.
- **Break it on purpose.** For each piece, list what can fail at each step: a request that fails or loses its response, a retry, a reload in the middle, two tabs, a second click, a late first value, data in an old shape, and a hostile host or member. Follow each one through the real callers to what the person sees. A defect is proved when a focused test with the real code shows it.
- **Name the class, not only the case.** Each defect is an instance of a pattern, such as "an error becomes empty" or "a write has no identity across a retry". Name the pattern, and the structure that makes every instance of it impossible.

These adapt the pstack skills (github.com/cursor/plugins): the investigation, `architect`, and `multi-phase-plan` playbooks of `poteto-mode`, `no-comments`, and the `principle-*` skills.

## Steps

1. **Read the repository.** Read `CLAUDE.md` or `AGENTS.md`, the repo-defaults rules they import, the docs in `docs/`, and each package README. Measure each package: source lines, test lines, exports of each entry, and the largest files. List the open pull requests and the work that other threads or people are doing now. The plan must not touch their files.
2. **Read the earlier runs.** Find the earlier plans, and list which of their items are done.
3. **Write the brief.** Write one brief file that every reviewer reads. Use the parts in "Reviewer brief" below.
4. **Split the tree into five to eight areas.** Group packages that share one job, for example: the data formats and shared code; storage; the main engine; the network layer; the public API and the apps; and one area for the architecture across all packages and for release readiness. Give each area to one agent with the Agent tool and `model: "fable"`, in the background, all in one message. Each agent reads the brief, changes nothing, calls no tool that posts to a person, and writes its findings to one file. The reviewers do not read each other's files.
5. **Pass on what the person adds.** If the person adds a goal while the agents work, append it to the brief as a new section, and send each agent one message that gives the section's name.
6. **Check the findings yourself.** When the agents finish, open the code on the current head for each defect and each claim that a change depends on. Mark each one as reproduced (a focused test showed it), source checked (you followed the path in the code), or probable. Where two reviewers disagree, write down the conflict and the reason for your choice.
7. **Rate and group the defects.** Give each defect one class of impact: a security defect that needs no attacker; a security defect that needs a hostile host or member (say which); lost data; a stuck or wrong view; or a small UI or API defect. Then group the defects by the pattern that causes them. For each group, give the structural change (a type, one owner, one state machine, a schema limit, or a lint) that makes the whole group impossible. A group of one gets a spot fix.
8. **Write the plan.** Use the outline in "The plan" below.
9. **Reply.** Write the reply for a person with little time, in plain words, with no plan ids or code names they must look up. Lead with the decisions that only the person can make. Give the verdict in a few lines, how many defects are in each class of impact, the patterns behind them, and the recommended first stage. Ask one direct question. Link the plan.

## Reviewer brief

The brief holds these parts:

- The repository path and the head commit. Read `CLAUDE.md` and the docs first.
- The goal in the person's own words.
- The measurements from step 1.
- The earlier runs, with their paths, and the items that step 2 found done. Check the current code before you call an earlier item open.
- The rules: read only; give `file:line` for each claim; count lines with `wc` where size matters.
- Formats: any format that stored data already uses. Mark a change to them FORMAT. The person weighs each one.
- The work in flight that the reviewer must not overlap.
- The principles above, and the path to the pr-review sections.
- The deliverable, at most about 600 lines:
  1. **Verdict:** three to six sentences.
  2. **The ideal shape, data first:** the records; the state as one type; the tables and keys; and the events. Then a table of the pieces: the role of each, its interface as TypeScript signatures, what it hides, its kind (a format, an interface with a version for each platform, or a package over one tool), and whether today's code is its final form.
  3. **Defects:** bugs, races, data loss, and security mistakes that a user can hit, each with the caller or input and the steps to the failure. Find them with "Break it on purpose" above. For each, say whether a focused test reproduced it (with its inputs and what it showed) or you followed it in the source only. Write a focused test outside the repository, and delete it when you are done. Give the class of impact from step 7 and the pattern behind the defect.
  4. **Findings, ranked by value:** what is wrong with `file:line` evidence, why it matters for clarity, boundaries, or deletion, the change, the net lines, and the size as one pull request (S, M, or L). Mark the dependencies.
  5. **Data that is wrong:** each union spelled as optional fields, flag that holds a state, sentinel, string that holds a structure, idea with two shapes, and state with two owners.
  6. **Boundaries:** each place where the words of one piece appear in another, marked inherent or accidental.
  7. **Deletion:** code that can be deleted now with no design change. For each feature, how far it reaches (files and lines in each package), and what boundary around it would make it one table row and one folder.
  8. **Comments:** where code depends on a comment that a name, a type, or a smaller function would replace, with the better shape, and JSDoc that only repeats the name.
  9. **Keeps:** what looks wrong but is right, with the reason.
  10. **Done:** a checklist of the conditions under which nothing in the area is left to change.

## The plan

The plan has these sections, in this order:

1. **Verdict.** What is close to final, and the few things that stand between the codebase and done.
2. **The pieces.** One table: piece, its one role, its data, its kind, and whether it is final today. Then the rules that hold across all pieces.
3. **Defects.** Only the ones you checked in the code, with evidence, who sees each one, and its class of impact. Mark each one as reproduced, source checked, or probable.
4. **Defect patterns.** One row for each group from step 7: the pattern, its defects, and the structural change that makes the group impossible. The changes in section 11 do the structural change, not one fix for each defect, where the group has more than one defect.
5. **Findings by area.** A short list for each area, with a link to its reviewer file for the evidence. Include the conflicts from step 6.
6. **The data fixes, in one list.** A table: today, final, where.
7. **Boundaries.** The accidental overlaps, and where each rule moves.
8. **Comments.** For each way in "Comments" below, an example from the tree.
9. **Deletion.** The code that can be deleted now, as one pull request. Then a table of each feature: how far it reaches today, what it is after the plan, and which change sets its boundary.
10. **Keeps.** What the review left unchanged, and why.
11. **The changes, in order.** One line for each pull request, with its size and net lines, in stages from the bottom of the stack up. Stage 0 deletes the code of section 9 and fixes the defects that are a group of one. Each later stage makes one group of pieces final before the next stage builds on them. Put the FORMAT changes in one stage. Name the dependencies and the work in flight that a change must wait for.
12. **Decisions for the person.** Each with options and a recommendation.
13. **What done means.** The checklist for the whole codebase.

## Comments

The rule is in the Comments section of `typescript.md`, and the `no-comments` skill applies it to a package. Each pull request also removes or replaces the comments in the code that it touches.

Ways to let the code say it:

- A comment that lists the cases of a value becomes a tagged union.
- A comment that says what `undefined` or `null` means becomes a result type with a name for each case.
- A comment that says when a field is empty becomes a required field or a second type.
- A comment that explains a magic value becomes a named constant.
- A comment that gives the encoding of bytes becomes a schema with that name.
- A comment that explains a rule inside a function becomes a small function or predicate named for the rule.
- A comment repeated on a parameter in many files becomes one type for the group of parameters.
- A comment that explains a workaround goes when the rule moves to the piece that owns it.
- A comment that explains a word from another piece goes when the code uses one word for one idea.
- A comment that explains why an order or a race matters becomes a test whose name says it.
- A comment that explains what a function hides becomes a better name or a split.
- A comment that restates the name goes.

What stays: the contract of an export (a unit, a limit, or what a caller must do), a behaviour forced by a platform or protocol we can't change, a lint suppression with a reason, and a link to an issue.

## Deletion

A feature is easy to delete when it is one row in a table and one folder in each package it reaches, and the shared code knows it only through the row. To test this, delete the folder and the row. The code still compiles, and only the feature's own tests fail.

To measure how far a feature reaches, count the non-test source files and lines that mention it in each package, for example with `rg -c`.

## After the plan

When the person picks a stage, run each change as its own pull request. When the stages are done, run this skill again. The codebase is done when a new run finds no finding to fix.
