import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vite-plus/test';
import plugin from '../src/oxlint.ts';

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'boolean-name',
  plugin.rules['boolean-name'],
  {
    valid: [
      'type Status = { readonly isOnline: boolean; hasPasskey?: boolean }',
      'type Options = { readonly discard: boolean; readonly discardNewer: boolean }',
      'function show(isOpen: boolean) {}',
      'let isDone: boolean = false',
      'class Session { isOpen: boolean = false }',
      'type Count = { readonly online: number }',
      'type Options = { readonly island: string }',
      'type Status = { readonly isOnline: boolean | undefined }',
      'let done = false',
      { code: 'type Options = { retry: boolean }', options: [{ verbs: ['retry'] }] },
    ],
    invalid: [
      {
        code: 'type Status = { readonly online: boolean }',
        errors: [{ messageId: 'booleanName' }],
      },
      { code: 'type Status = { done?: boolean }', errors: [{ messageId: 'booleanName' }] },
      { code: 'function show(open: boolean) {}', errors: [{ messageId: 'booleanName' }] },
      { code: 'let done: boolean = false', errors: [{ messageId: 'booleanName' }] },
      { code: 'class Session { open: boolean = false }', errors: [{ messageId: 'booleanName' }] },
      { code: 'type Status = { island: boolean }', errors: [{ messageId: 'booleanName' }] },
      {
        code: 'type Status = { readonly online: boolean | undefined }',
        errors: [{ messageId: 'booleanName' }],
      },
      { code: 'function show(open?: boolean | null) {}', errors: [{ messageId: 'booleanName' }] },
      { code: 'type Options = { retry: boolean }', errors: [{ messageId: 'booleanName' }] },
    ],
  },
);
