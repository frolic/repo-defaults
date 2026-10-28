#!/usr/bin/env node
// A Claude Code PreToolUse hook for Bash. It reads the hook's JSON on stdin, and refuses a command
// that edits files in place or writes them from a script: exit code 2 makes Claude Code refuse the
// command and show stderr to the agent. The Edit and Write tools show each change as a diff, which
// a person can review.
import { readFileSync } from 'node:fs';
import { findInPlaceEdit } from './findInPlaceEdit.ts';

const input = JSON.parse(readFileSync(0, 'utf8')) as {
  tool_input?: { command?: unknown } | undefined;
};
const command = input.tool_input?.command;
const edit = findInPlaceEdit(typeof command === 'string' ? command : '');
if (edit !== undefined) {
  console.error(
    `Refused: this command edits files with ${edit}. Use the Edit tool to change a file, or the Write tool to create one, so each change shows as a diff.`,
  );
  process.exitCode = 2;
}
