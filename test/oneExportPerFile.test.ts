import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vite-plus/test';
import plugin from '../src/oxlint.ts';

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'one-export-per-file',
  plugin.rules['one-export-per-file'],
  {
    valid: [
      { filename: 'src/readHead.ts', code: 'export const readHead = () => 1' },
      { filename: 'src/readHead.ts', code: 'export function readHead() {}' },
      { filename: 'src/Failed.ts', code: 'export class Failed {}' },
      { filename: 'src/Mark.tsx', code: 'export function Mark() { return null }' },
      {
        filename: 'src/Icon.tsx',
        code: 'export type IconName = string\nexport interface IconProps {}\nexport function Icon() {}',
      },
      {
        filename: 'src/readHead.ts',
        code: 'type Options = {}\ntype Head = {}\nexport type { Options }\nexport { type Head }\nexport const readHead = 1',
      },
      {
        filename: 'src/send.ts',
        code: 'export function send() {}\nexport declare namespace send { type Options = {} }',
      },
      { filename: 'src/Row.ts', code: 'type Fields = {}\nexport type Row = Fields' },
      { filename: 'src/Row.ts', code: 'export type Row = {}\nexport type RowKey = string' },
      {
        filename: 'src/passkey/constants.ts',
        code: "export const relyingParty = 'example'\nexport const timeoutMs = 60_000, retries = 3\nexport type Kind = 'a'",
      },
      { filename: 'src/main.tsx', code: 'render()' },
      { filename: 'src/worker.ts', code: 'export class Relay {}\nexport default { fetch }' },
      { filename: 'vite.config.ts', code: 'export default defineConfig({})' },
      {
        filename: 'src/fetchPage.ts',
        code: 'export function fetchPage() {}\nexport default fetchPage',
      },
      {
        filename: 'src/index.ts',
        code: "export { readHead } from './readHead.js'\nexport * from './Head.js'",
      },
      { filename: 'src/env.d.ts', code: 'export type A = 1\nexport type B = 2' },
    ],
    invalid: [
      {
        filename: 'src/passkey.ts',
        code: 'export function createPasskey() {}\nexport function readPasskey() {}',
        errors: [{ messageId: 'oneValuePerFile' }, { messageId: 'oneValuePerFile' }],
      },
      {
        filename: 'src/readHead.ts',
        code: 'export const readHead = 1, readHeads = 2',
        errors: [{ messageId: 'oneValuePerFile' }],
      },
      {
        filename: 'src/readHead.ts',
        code: 'const readHead = 1\nconst helper = 2\nexport { readHead, helper }',
        errors: [{ messageId: 'oneValuePerFile' }],
      },
      {
        filename: 'src/constants.ts',
        code: 'export const pageBytes = 1\nexport const headBytes = 2',
        errors: [{ messageId: 'scopedConstants' }, { messageId: 'scopedConstants' }],
      },
      {
        filename: 'src/passkey/constants.ts',
        code: 'export const timeoutMs = 1\nexport const readPasskey = () => 1\nexport function sign() {}',
        errors: [{ messageId: 'scopedConstants' }, { messageId: 'scopedConstants' }],
      },
      {
        filename: 'src/common.ts',
        code: 'export type PostId = string',
        errors: [{ messageId: 'typesNamedForFile' }],
      },
      {
        filename: 'vite.config.ts',
        code: 'export const port = 1\nexport default defineConfig({})',
        errors: [{ messageId: 'oneValuePerFile' }],
      },
    ],
  },
);
