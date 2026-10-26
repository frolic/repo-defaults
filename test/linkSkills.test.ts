import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readlinkSync, realpathSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vite-plus/test';

const script = join(import.meta.dirname, '../src/linkSkills.ts');

test('links every skill and agent and keeps the repo own copies', () => {
  const host = realpathSync(mkdtempSync(join(tmpdir(), 'host-')));
  mkdirSync(join(host, '.claude/skills/tdd'), { recursive: true });
  execFileSync(process.execPath, [script], { cwd: host });
  execFileSync(process.execPath, [script], { cwd: host });

  const link = join(host, '.claude/skills/prose-review');
  expect(existsSync(join(link, 'SKILL.md'))).toBe(true);
  expect(resolve(join(host, '.claude/skills'), readlinkSync(link))).toBe(
    join(import.meta.dirname, '../skills/prose-review'),
  );
  expect(readlinkSync(join(host, '.agents/skills/unslop'))).not.toMatch(/^\//);
  expect(existsSync(join(host, '.claude/agents/comment-sicko.md'))).toBe(true);
  expect(existsSync(join(host, '.claude/skills/tdd/SKILL.md'))).toBe(false);
});
