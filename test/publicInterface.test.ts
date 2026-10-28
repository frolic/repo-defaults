import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { publicInterface } from '../src/publicInterface.ts';

const root = join(import.meta.dirname, '..');

test('publicInterface prints each export of an entry as a signature, sorted by name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'interface-'));
  writeFileSync(
    join(dir, 'index.ts'),
    [
      "export { send } from './send.ts';",
      'export type Status = { isOnline: boolean };',
      'export const retries = 3;',
      'export class Failed extends Error {',
      '  constructor(readonly code: number) { super(String(code)); }',
      '  describe(): string { return this.message; }',
      '}',
    ].join('\n'),
  );
  writeFileSync(
    join(dir, 'send.ts'),
    [
      'type Body = { text: string };',
      'export function send(body: Body, options: send.Options = {}): Promise<void> {',
      '  return Promise.resolve();',
      '}',
      'export declare namespace send {',
      '  type Options = { signal?: AbortSignal | undefined };',
      '}',
    ].join('\n'),
  );
  expect(publicInterface([{ specifier: '@acme/mail', path: join(dir, 'index.ts') }])).toBe(
    [
      '@acme/mail',
      '',
      '  class Failed extends Error {',
      '      constructor(readonly code: number);',
      '      describe(): string;',
      '  }',
      '',
      '  const retries: 3',
      '',
      '  const send: (body: Body, options?: send.Options) => Promise<void>',
      '  namespace send {',
      '      type Options = {',
      '          signal?: AbortSignal | undefined;',
      '      };',
      '  }',
      '',
      '  type Status = {',
      '      isOnline: boolean;',
      '  };',
      '',
    ].join('\n'),
  );
});

// Other repos import these modules, so a change to their names or types changes every one of them.
// The oxc and oxlint modules hold config whose values change with each rule, and the rule tests
// cover them, so they are left out.
test('the public interface of repo-defaults changes only with the owner agreement', async () => {
  const { exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    exports: Record<string, string | { src: string }>;
  };
  const entries = Object.entries(exports).flatMap(([entry, target]) =>
    typeof target === 'string' || ['./oxc', './oxlint'].includes(entry)
      ? []
      : [{ specifier: `repo-defaults${entry.slice(1)}`, path: join(root, target.src) }],
  );
  await expect(
    publicInterface(entries, { compilerOptions: { lib: ['lib.es2024.d.ts'], types: ['node'] } }),
    'The public interface changed. Show the owner the diff of test/publicInterface.txt and why, and rewrite it with `pnpm test -u` only once the owner agrees.',
  ).toMatchFileSnapshot('./publicInterface.txt');
}, 60_000);
