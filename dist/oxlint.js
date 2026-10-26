const isNode = (value) => typeof value === 'object' && value !== null && 'type' in value;
// `unknown`, `unique symbol`, `Record<…>` (alone or in `Partial` or `Readonly`), a mapped type, or
// a type literal with an index signature.
function isWide(type) {
    if (!isNode(type)) {
        return false;
    }
    if (type.type === 'TSUnknownKeyword') {
        return true;
    }
    if (type.type === 'TSTypeOperator') {
        return type['operator'] === 'unique';
    }
    if (type.type === 'TSMappedType') {
        return true;
    }
    if (type.type === 'TSTypeLiteral') {
        return type['members'].some((member) => member.type === 'TSIndexSignature');
    }
    if (type.type !== 'TSTypeReference') {
        return false;
    }
    const name = type['typeName'];
    if (name.type !== 'Identifier') {
        return false;
    }
    if (name['name'] === 'Record') {
        return true;
    }
    const [argument] = (type['typeArguments']?.['params'] ?? []);
    return ['Partial', 'Readonly'].includes(name['name']) && !!argument && isWide(argument);
}
// `[]`, `new Map()`, or `new Set()`, or an array or object literal holding only those.
function isEmpty(node) {
    if (!isNode(node)) {
        return false;
    }
    if (node.type === 'ArrayExpression') {
        return node['elements'].every(isEmpty);
    }
    if (node.type === 'ObjectExpression') {
        return node['properties'].every((property) => property.type === 'Property' && isEmpty(property['value']));
    }
    if (node.type !== 'NewExpression') {
        return false;
    }
    const callee = node['callee'];
    return (callee.type === 'Identifier' &&
        ['Map', 'Set'].includes(callee['name']) &&
        node['arguments'].length === 0 &&
        node['typeArguments'] == null);
}
// `name.key = …`, `name[key] = …`, `name.key++`, or `delete name.key`.
function writesMember(identifier) {
    if (!isNode(identifier)) {
        return false;
    }
    const member = identifier.parent;
    if (member?.type !== 'MemberExpression' || member['object'] !== identifier) {
        return false;
    }
    const parent = member.parent;
    if (parent?.type === 'AssignmentExpression') {
        return parent['left'] === member;
    }
    if (parent?.type === 'UpdateExpression') {
        return true;
    }
    return parent?.type === 'UnaryExpression' && parent['operator'] === 'delete';
}
/**
 * Reports `const name: Type = value`. The annotation widens the constant to `Type`, while
 * `const name = value satisfies Type` checks the value against `Type` and keeps the narrower type
 * that TypeScript infers. It allows an annotation when the wider type is the point: a `unique
 * symbol`, an exported constant, whose annotation is its public type, and an object that the
 * code later adds properties to or that refers to itself. It also allows one on a type with an
 * index signature, such as `Record<string, number>`, because the code looks up keys with any
 * string, and one on an empty collection, such as `const chunks: Uint8Array[] = []`, because
 * `[] satisfies Uint8Array[]` infers `never[]` and the first `push` fails to type-check.
 */
const preferSatisfies = {
    meta: {
        type: 'suggestion',
        messages: {
            preferSatisfies: 'Write `const name = value satisfies Type`. If the inferred type is too narrow or circular, use a function with a return type, or a `let`.',
        },
    },
    create: (context) => ({
        VariableDeclarator: (node) => {
            if (node.parent.type !== 'VariableDeclaration' || node.parent.kind !== 'const') {
                return;
            }
            if (node.parent.parent?.type === 'ExportNamedDeclaration') {
                return;
            }
            if (node.init === null) {
                return;
            }
            if (!('typeAnnotation' in node.id) || node.id.typeAnnotation == null) {
                return;
            }
            if (isWide(node.id.typeAnnotation.typeAnnotation)) {
                return;
            }
            if (isEmpty(node.init)) {
                return;
            }
            // `const view: Type = value` reads an existing value through a wider type.
            if (node.init.type === 'Identifier' || node.init.type === 'MemberExpression') {
                return;
            }
            const [variable] = context.sourceCode.getDeclaredVariables(node);
            if (variable?.references.some((reference) => writesMember(reference.identifier))) {
                return;
            }
            // An initializer that refers to the constant itself needs the annotation to infer a type.
            const [start, end] = node.init.range;
            if (variable?.references.some(({ identifier: { range } }) => range[0] >= start && range[1] <= end)) {
                return;
            }
            context.report({ node: node.id, messageId: 'preferSatisfies' });
        },
    }),
};
const isReported = (name) => name.length === 1 || /^[A-Z]/.test(name);
/**
 * Reports a type parameter or a mapped-type key with a capitalized or one-letter name. A lowercase
 * word, such as `chunk`, tells the reader what the parameter holds.
 */
const typeParameterName = {
    meta: {
        type: 'suggestion',
        messages: {
            typeParameterName: 'Name a type parameter with a lowercase word that says what it holds, such as `chunk`.',
        },
    },
    create: (context) => ({
        TSTypeParameter: (node) => {
            if (isReported(node.name.name)) {
                context.report({ node: node.name, messageId: 'typeParameterName' });
            }
        },
        TSMappedType: (node) => {
            if (isReported(node.key.name)) {
                context.report({ node: node.key, messageId: 'typeParameterName' });
            }
        },
    }),
};
/**
 * Reports an optional property whose type leaves out `undefined`, such as `foo?: string`. With
 * `exactOptionalPropertyTypes`, TypeScript rejects an explicit `undefined` for it, so a caller
 * can't pass `{ signal: options.signal }` through when `options.signal` is optional.
 */
const optionalUndefined = {
    meta: {
        type: 'problem',
        fixable: 'code',
        messages: { optionalUndefined: 'Write an optional property as `name?: Type | undefined`.' },
    },
    create: (context) => ({
        TSPropertySignature: (node) => {
            if (!node.optional || node.typeAnnotation == null) {
                return;
            }
            const type = node.typeAnnotation.typeAnnotation;
            if (allowsUndefined(type)) {
                return;
            }
            const text = context.sourceCode.getText(type);
            const wrap = type.type === 'TSFunctionType' ||
                type.type === 'TSConstructorType' ||
                type.type === 'TSConditionalType';
            context.report({
                node: node.key,
                messageId: 'optionalUndefined',
                fix: (fixer) => fixer.replaceText(type, `${wrap ? `(${text})` : text} | undefined`),
            });
        },
    }),
};
// `undefined`, `unknown`, `any`, or a union that holds one of them.
function allowsUndefined(type) {
    if (['TSUndefinedKeyword', 'TSUnknownKeyword', 'TSAnyKeyword'].includes(type.type)) {
        return true;
    }
    return type.type === 'TSUnionType' && type['types'].some(allowsUndefined);
}
/**
 * Reports a relative import or re-export without the `.js` extension. Node and browsers resolve
 * the path as written, so `./utils` doesn't load after the build.
 */
const importExtension = {
    meta: {
        type: 'problem',
        messages: { importExtension: 'End a relative import with `.js`.' },
    },
    create: (context) => {
        const check = (node) => {
            const source = node.source;
            if (!isNode(source) || typeof source['value'] !== 'string') {
                return;
            }
            const path = source['value'];
            if (!path.startsWith('./') && !path.startsWith('../')) {
                return;
            }
            if (/\.(js|json)$/.test(path) || path.includes('?')) {
                return;
            }
            context.report({ node: source, messageId: 'importExtension' });
        };
        return {
            ImportDeclaration: check,
            ExportAllDeclaration: check,
            ExportNamedDeclaration: check,
            ImportExpression: check,
        };
    },
};
/**
 * Reports an `enum`. A union of string literals types the same values, needs no runtime object,
 * and lets a caller pass the string itself.
 */
const noEnum = {
    meta: {
        type: 'suggestion',
        messages: { noEnum: "Use a union of string literals, such as `type Mode = 'a' | 'b'`." },
    },
    create: (context) => ({
        TSEnumDeclaration: (node) => context.report({ node: node.id, messageId: 'noEnum' }),
    }),
};
/**
 * The oxlint rules under the `defaults` prefix. The `lint` settings in `oxc.ts` load the plugin and
 * turn on every rule.
 */
const plugin = {
    meta: { name: 'defaults' },
    rules: {
        'import-extension': importExtension,
        'no-enum': noEnum,
        'optional-undefined': optionalUndefined,
        'prefer-satisfies': preferSatisfies,
        'type-parameter-name': typeParameterName,
    },
};
export default plugin;
