import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vite-plus/test';
import plugin from '../src/oxlint.ts';

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'type-parameter-name',
  plugin.rules['type-parameter-name'],
  {
    valid: [
      'function read<chunk>(value: chunk) {}',
      'function tagged<const tag extends string>(tag: tag) {}',
      'type Optional<fields> = { [key in keyof fields]?: fields[key] }',
      'type Item<list> = list extends Array<infer item> ? item : never',
    ],
    invalid: [
      {
        code: 'function read<Chunk>(value: Chunk) {}',
        errors: [{ messageId: 'typeParameterName' }],
      },
      { code: 'function read<T>(value: T) {}', errors: [{ messageId: 'typeParameterName' }] },
      {
        code: 'type Item<list> = list extends Array<infer t> ? t : never',
        errors: [{ messageId: 'typeParameterName' }],
      },
      { code: 'class Box<T> {}', errors: [{ messageId: 'typeParameterName' }] },
      { code: 'type Read = <U>(value: U) => U', errors: [{ messageId: 'typeParameterName' }] },
      {
        code: 'type Optional<fields> = { [K in keyof fields]?: fields[K] }',
        errors: [{ messageId: 'typeParameterName' }],
      },
    ],
  },
);
