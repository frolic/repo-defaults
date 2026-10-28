import { fileURLToPath } from 'node:url';
import type { OxfmtConfig } from 'oxfmt';
import type { OxlintConfig } from 'oxlint';

// The plugin sits beside this file: `oxlint.ts` in a checkout and `oxlint.js` in the built
// package. oxlint loads it by absolute path, so the path doesn't depend on where the host repo puts
// this one.
const extension = import.meta.url.endsWith('.ts') ? '.ts' : '.js';
const plugin = fileURLToPath(new URL(`./oxlint${extension}`, import.meta.url));

/**
 * The oxfmt settings. Spread them into the `fmt` section of `vite.config.ts` and add the repo's own
 * `ignorePatterns` after these.
 *
 * @example
 * import { fmt } from 'repo-defaults/oxc';
 *
 * export default defineConfig({ fmt: { ...fmt, ignorePatterns: [...fmt.ignorePatterns, 'site/**'] } });
 */
export const fmt = {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  ignorePatterns: [
    '**/*.md',
    '**/package.json',
    '**/CHANGELOG.md',
    '**/fixtures/**',
    '.agents/**',
    'repo-defaults/**',
  ],
} satisfies OxfmtConfig;

/**
 * The oxlint settings: plugins, categories, the rules every repo turns on or off, and the
 * `defaults/*` rules from `oxlint.ts`. Spread them into the `lint` section of `vite.config.ts`, and
 * add the repo's own `jsPlugins`, `rules`, and `overrides` after these.
 *
 * @example
 * import { lint } from 'repo-defaults/oxc';
 *
 * export default defineConfig({
 *   lint: { ...lint, rules: { ...lint.rules, 'no-console': 'off' }, overrides: [...lint.overrides] },
 * });
 */
export const lint = {
  plugins: ['eslint', 'typescript', 'unicorn', 'vitest', 'import', 'jsdoc', 'oxc'],
  categories: { suspicious: 'error', perf: 'error' },
  jsPlugins: [plugin],
  options: { typeAware: true, typeCheck: true },
  ignorePatterns: ['**/dist/**', '**/fixtures/**', '.agents/**', 'repo-defaults/**'],
  rules: {
    // Every if, else, and loop body needs braces, so a reader always sees where the body ends.
    curly: ['error', 'all'],
    'no-console': 'error',
    'defaults/boolean-name': 'error',
    'defaults/import-extension': 'error',
    'defaults/no-enum': 'error',
    'defaults/one-export-per-file': 'error',
    'defaults/optional-undefined': 'error',
    'defaults/prefer-satisfies': 'error',
    'defaults/type-parameter-name': 'error',
    // Turned off from the suspicious and perf categories. Streams and retries await in a loop on
    // purpose, and the other rules report a style that code following typescript.md uses
    // everywhere.
    'eslint/no-await-in-loop': 'off',
    'eslint/no-shadow': 'off',
    'eslint/no-underscore-dangle': 'off',
    'unicorn/consistent-function-scoping': 'off',
    'typescript/no-unsafe-type-assertion': 'off',
    // Default imports of CommonJS libraries.
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    // Early `return` in a void function, and String() on input typed string but unchecked at run
    // time.
    'typescript/consistent-return': 'off',
    'typescript/no-unnecessary-type-conversion': 'off',
    // Its fix turns a test title `${name}` into `name`, which vitest/valid-title then rejects.
    'typescript/no-unnecessary-template-expression': 'off',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-default-export': 'error',
    'typescript/consistent-type-definitions': ['error', 'type'],
    'typescript/array-type': ['error', { default: 'array' }],
    'typescript/no-unnecessary-type-assertion': 'error',
    'unicorn/no-abusive-eslint-disable': 'error',
    'jsdoc/check-tag-names': 'error',
    'jsdoc/empty-tags': 'error',
    'jsdoc/no-defaults': 'error',
    'jsdoc/require-param-name': 'error',
    'no-irregular-whitespace': [
      'error',
      { skipStrings: false, skipRegExps: false, skipTemplates: false },
    ],
  },
  overrides: [
    {
      // Config files and oxlint plugins have to export a default.
      files: ['**/vite.config.ts', '**/*.config.ts', '**/*.config.mts'],
      rules: { 'import/no-default-export': 'off' },
    },
  ],
} satisfies OxlintConfig;
