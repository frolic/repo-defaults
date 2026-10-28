---
name: retro
description: Daily retro. Reads the past day's threads, commits, and verdicts. Finds the corrections and the rework that happened more than once, and turns each into a check that fails. Use when the daily scheduled task fires, or after a long piece of work.
---

# Retro

A correction the owner has to give twice is a gap in the process, not in the agent. The "Corrections and retro" section of `workflow.md` in repo-defaults says why. This file says how.

## 1. Gather, in a subagent

The thread that runs the retro holds only the result. First list the threads, sessions, or chats that were active since the last retro, if your environment can read them. Write the owner's messages, and the agent replies they answer, to a scratch file. Pass that file to a fresh subagent, together with:

- `git log --since` for the default branch and the open branches;
- the verdicts posted on pull requests since the last retro (see the `pr-review` skill);
- `.claude/corrections.md`.

## 2. Find

The subagent lists each finding with a link to the message or commit that shows it:

- **A correction.** The owner says an agent did something wrong, repeats an ask, or undoes a choice. It's a correction even when it's phrased politely ("you've removed it every rewrite").
- **A slow decision.** A question that took more than one round, or an answer that was misread.
- **Rework.** A revert, a fix to a fix, or work that was claimed done and then failed a check or the owner's eye.

It matches each finding against the rows in `.claude/corrections.md`. A new finding gets a new row with a count of 1. A finding that matches a row raises its count and its date.

## 3. Fix what happened twice

For each row at 2 or more whose `Enforced by` cell names no check, fix it at the highest level that works:

1. **The design.** Remove the way to make the mistake.
2. **A type.** The bad state can't be written.
3. **A lint rule, hook, or test.** Its error says what to do instead.
4. **A doc line, last.** Use this only for judgment calls, since nothing fails when an agent skips it.

Each fix is one commit on a branch. It shows that the check fails on the real past mistake, then passes. It names the check in the row and adds the rule and its check to the rules table in CLAUDE.md or AGENTS.md. A fix that would change a public interface, a goal, or a performance budget goes to the owner instead, as "What needs the owner" in `workflow.md` says.

## 4. Report

If anything changed or needs the owner, send one message of at most 8 lines:

- what was found;
- what is now enforced, with the commits;
- what needs the owner's call.

If nothing did, send nothing.
