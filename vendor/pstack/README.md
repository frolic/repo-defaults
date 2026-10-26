# pstack (vendored)

These skills and the `comment-sicko` agent are copied unchanged from [cursor/plugins](https://github.com/cursor/plugins/tree/0b8e952052d482ee6de06deebf14d590d77b1b34/pstack) at commit `0b8e952052d482ee6de06deebf14d590d77b1b34` (2026-10-18). They are MIT licensed (see [LICENSE](LICENSE)).

Do not edit the copies. To update them, copy the same folders from a newer upstream commit and change the commit above.

`link-skills` (`src/linkSkills.ts`) links each skill into a repo at `.claude/skills/<name>` and `.agents/skills/<name>`, because Claude Code only finds skills at `.claude/skills/<name>/SKILL.md` and other agents read `.agents/skills/`. It links the `comment-sicko` agent the same way into `.claude/agents/` and `.agents/agents/`.

Some skills mention pstack skills that are not copied here, such as `poteto-mode`, `why`, and `arena`. Those steps don't apply.

Copied skills:

- Writing: `technical-writing`, `unslop`
- Comments: `no-comments` with the `comment-sicko` agent
- Design and structure: `architect`, `how`, `principle-foundational-thinking`, `principle-model-the-domain`, `principle-type-system-discipline`, `principle-boundary-discipline`, `principle-minimize-reader-load`, `principle-laziness-protocol`, `principle-subtract-before-you-add`, `principle-redesign-from-first-principles`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-encode-lessons-in-structure`, `typescript-best-practices`
- Review: `interrogate`, `blast-radius`, `correct`
- Testing and verification: `tdd`, `principle-test-behavior-not-implementation`, `principle-prove-it-works`, `principle-fix-root-causes`, `principle-sequence-verifiable-units`
- Benchmarks: `benchmark-checklist`, `principle-explain-the-number`
