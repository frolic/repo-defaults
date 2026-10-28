/**
 * The oxfmt settings. Spread them into the `fmt` section of `vite.config.ts` and add the repo's own
 * `ignorePatterns` after these.
 *
 * @example
 * import { fmt } from 'repo-defaults/oxc';
 *
 * export default defineConfig({ fmt: { ...fmt, ignorePatterns: [...fmt.ignorePatterns, 'site/**'] } });
 */
export declare const fmt: {
    singleQuote: true;
    semi: true;
    trailingComma: "all";
    printWidth: number;
    ignorePatterns: string[];
};
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
export declare const lint: {
    plugins: ("eslint" | "unicorn" | "typescript" | "oxc" | "import" | "jsdoc" | "vitest")[];
    categories: {
        suspicious: "error";
        perf: "error";
    };
    jsPlugins: string[];
    options: {
        typeAware: true;
        typeCheck: true;
    };
    ignorePatterns: string[];
    rules: {
        curly: ["error", "all"];
        'no-console': "error";
        'defaults/boolean-name': "error";
        'defaults/import-extension': "error";
        'defaults/no-enum': "error";
        'defaults/one-export-per-file': "error";
        'defaults/optional-undefined': "error";
        'defaults/prefer-satisfies': "error";
        'defaults/type-parameter-name': "error";
        'eslint/no-await-in-loop': "off";
        'eslint/no-shadow': "off";
        'eslint/no-underscore-dangle': "off";
        'unicorn/consistent-function-scoping': "off";
        'typescript/no-unsafe-type-assertion': "off";
        'import/no-named-as-default': "off";
        'import/no-named-as-default-member': "off";
        'typescript/consistent-return': "off";
        'typescript/no-unnecessary-type-conversion': "off";
        'typescript/no-unnecessary-template-expression': "off";
        'import/no-cycle': "error";
        'import/no-self-import': "error";
        'import/no-duplicates': "error";
        'import/no-default-export': "error";
        'typescript/consistent-type-definitions': ["error", "type"];
        'typescript/array-type': ["error", {
            default: "array";
        }];
        'typescript/no-unnecessary-type-assertion': "error";
        'unicorn/no-abusive-eslint-disable': "error";
        'jsdoc/check-tag-names': "error";
        'jsdoc/empty-tags': "error";
        'jsdoc/no-defaults': "error";
        'jsdoc/require-param-name': "error";
        'no-irregular-whitespace': ["error", {
            skipStrings: false;
            skipRegExps: false;
            skipTemplates: false;
        }];
    };
    overrides: {
        files: string[];
        rules: {
            'import/no-default-export': "off";
        };
    }[];
};
