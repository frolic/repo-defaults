import type { RuleTester } from 'oxlint/plugins-dev';
type Rule = Parameters<RuleTester['run']>[1];
type Plugin = {
    meta: {
        name: string;
    };
    rules: Record<'import-extension' | 'no-enum' | 'optional-undefined' | 'prefer-satisfies' | 'type-parameter-name', Rule>;
};
declare const _default: Plugin;
export default _default;
