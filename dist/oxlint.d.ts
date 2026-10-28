import type { RuleTester } from 'oxlint/plugins-dev';
type Rule = Parameters<RuleTester['run']>[1];
type Plugin = {
    meta: {
        name: string;
    };
    rules: Record<'boolean-name' | 'import-extension' | 'no-enum' | 'one-export-per-file' | 'optional-undefined' | 'prefer-satisfies' | 'type-parameter-name', Rule>;
};
declare const _default: Plugin;
export default _default;
