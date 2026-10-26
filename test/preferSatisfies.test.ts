import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vite-plus/test';
import plugin from '../src/oxlint.ts';

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'prefer-satisfies',
  plugin.rules['prefer-satisfies'],
  {
    valid: [
      'const count = 1 satisfies number',
      'let total: number = 0',
      'const { count } = { count: 1 }',
      'for (const item of []) {}',
      "const brand: unique symbol = Symbol.for('a')",
      'const sizes: Record<string, number> = { a: 1 }',
      'const sizes: { [name: string]: number } = {}',
      'const result: { a?: number } = {}; result.a = 1',
      'const counts: Counts = {}; counts[key]++',
      'const body: unknown = await response.json()',
      'const usage: Partial<Record<Usage, Usage>> = { sign: "verify" }',
      'const native: { from?: From } = ReadableStream',
      'export const json: Codec = { encode, decode }',
      'const mock: Mock = { calls: [], call: () => mock.calls.length }',
      'const chunks: Uint8Array[] = []',
      'const segments: string[][] = [[]]',
      'const index: Index = { names: new Map(), ranges: [] }',
    ],
    invalid: [
      { code: 'const count: number = 1', errors: [{ messageId: 'preferSatisfies' }] },
      { code: 'const chunks: Uint8Array[] = [a]', errors: [{ messageId: 'preferSatisfies' }] },
      {
        code: "const parsed: Parsed = JSON.parse('1')",
        errors: [{ messageId: 'preferSatisfies' }],
      },
      {
        code: 'const result: Result = { a: 1 }; read(result.a)',
        errors: [{ messageId: 'preferSatisfies' }],
      },
    ],
  },
);
