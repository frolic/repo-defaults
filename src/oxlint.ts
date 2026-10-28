import type { RuleTester } from 'oxlint/plugins-dev';

// oxlint loads this file with Node, which can't resolve a relative `.js` import to a `.ts` file,
// so the rules are defined here instead of in their own modules.

type Rule = Parameters<RuleTester['run']>[1];

type Node = { type: string; parent?: Node | null | undefined; [key: string]: unknown };

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && 'type' in value;

// `unknown`, `unique symbol`, `Record<…>` (alone or in `Partial` or `Readonly`), a mapped type, or
// a type literal with an index signature.
function isWide(type: unknown): boolean {
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
    return (type['members'] as Node[]).some((member) => member.type === 'TSIndexSignature');
  }
  if (type.type !== 'TSTypeReference') {
    return false;
  }
  const name = type['typeName'] as Node;
  if (name.type !== 'Identifier') {
    return false;
  }
  if (name['name'] === 'Record') {
    return true;
  }
  const [argument] = ((type['typeArguments'] as Node | null)?.['params'] ?? []) as Node[];
  return ['Partial', 'Readonly'].includes(name['name'] as string) && !!argument && isWide(argument);
}

// `[]`, `new Map()`, or `new Set()`, or an array or object literal holding only those.
function isEmpty(node: unknown): boolean {
  if (!isNode(node)) {
    return false;
  }
  if (node.type === 'ArrayExpression') {
    return (node['elements'] as unknown[]).every(isEmpty);
  }
  if (node.type === 'ObjectExpression') {
    return (node['properties'] as Node[]).every(
      (property) => property.type === 'Property' && isEmpty(property['value']),
    );
  }
  if (node.type !== 'NewExpression') {
    return false;
  }
  const callee = node['callee'] as Node;
  return (
    callee.type === 'Identifier' &&
    ['Map', 'Set'].includes(callee['name'] as string) &&
    (node['arguments'] as unknown[]).length === 0 &&
    node['typeArguments'] == null
  );
}

// `name.key = …`, `name[key] = …`, `name.key++`, or `delete name.key`.
function writesMember(identifier: unknown): boolean {
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
      preferSatisfies:
        'Write `const name = value satisfies Type`. If the inferred type is too narrow or circular, use a function with a return type, or a `let`.',
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
      if (
        variable?.references.some(
          ({ identifier: { range } }) => range[0] >= start && range[1] <= end,
        )
      ) {
        return;
      }
      context.report({ node: node.id, messageId: 'preferSatisfies' });
    },
  }),
} satisfies Rule;

const isReported = (name: string) => name.length === 1 || /^[A-Z]/.test(name);

/**
 * Reports a type parameter or a mapped-type key with a capitalized or one-letter name. A lowercase
 * word, such as `chunk`, tells the reader what the parameter holds.
 */
const typeParameterName = {
  meta: {
    type: 'suggestion',
    messages: {
      typeParameterName:
        'Name a type parameter with a lowercase word that says what it holds, such as `chunk`.',
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
} satisfies Rule;

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
      const type = node.typeAnnotation.typeAnnotation as unknown as Node;
      if (allowsUndefined(type)) {
        return;
      }
      const text = context.sourceCode.getText(type as never);
      const wrap =
        type.type === 'TSFunctionType' ||
        type.type === 'TSConstructorType' ||
        type.type === 'TSConditionalType';
      context.report({
        node: node.key,
        messageId: 'optionalUndefined',
        fix: (fixer) =>
          fixer.replaceText(type as never, `${wrap ? `(${text})` : text} | undefined`),
      });
    },
  }),
} satisfies Rule;

// `undefined`, `unknown`, `any`, or a union that holds one of them.
function allowsUndefined(type: Node): boolean {
  if (['TSUndefinedKeyword', 'TSUnknownKeyword', 'TSAnyKeyword'].includes(type.type)) {
    return true;
  }
  return type.type === 'TSUnionType' && (type['types'] as Node[]).some(allowsUndefined);
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
    const check = (node: { source?: unknown }) => {
      const source = node.source as Node | null | undefined;
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
      context.report({ node: source as never, messageId: 'importExtension' });
    };
    return {
      ImportDeclaration: check,
      ExportAllDeclaration: check,
      ExportNamedDeclaration: check,
      ImportExpression: check,
    };
  },
} satisfies Rule;

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
} satisfies Rule;

type Context = Parameters<Extract<Rule, { create: unknown }>['create']>[0];

type Statement = Context['sourceCode']['ast']['body'][number];

type Kind = 'type' | 'value';

const typeDeclarations = new Set(['TSTypeAliasDeclaration', 'TSInterfaceDeclaration']);

// The names that a top-level statement declares, whether it exports them or not, each as a type
// or a value.
function declaredBy(statement: Statement): { name: string; kind: Kind }[] {
  const declaration =
    statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
      ? statement.declaration
      : statement;
  if (declaration === null || declaration === undefined) {
    return [];
  }
  if (declaration.type === 'ImportDeclaration') {
    return declaration.specifiers.map((specifier) => ({
      name: specifier.local.name,
      kind:
        declaration.importKind === 'type' ||
        ('importKind' in specifier && specifier.importKind === 'type')
          ? 'type'
          : 'value',
    }));
  }
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.map((declarator) => ({
      name: declarator.id.type === 'Identifier' ? declarator.id.name : '',
      kind: 'value',
    }));
  }
  if ('id' in declaration && declaration.id?.type === 'Identifier') {
    return [
      {
        name: declaration.id.name,
        kind: typeDeclarations.has(declaration.type) ? 'type' : 'value',
      },
    ];
  }
  return [];
}

// The names that a top-level statement exports from this file, each as a type or a value. A
// re-export (`export … from`) exports names from another file, so it gives none.
function exportsOf(
  statement: Statement,
  kindOf: (name: string) => Kind,
): { name: string; kind: Kind; statement: Statement }[] {
  if (statement.type !== 'ExportNamedDeclaration' || statement.source !== null) {
    return [];
  }
  if (statement.declaration !== null) {
    return declaredBy(statement).map(({ name, kind }) => ({ name, kind, statement }));
  }
  return statement.specifiers.map((specifier) => ({
    name:
      specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value,
    kind:
      statement.exportKind === 'type' || specifier.exportKind === 'type'
        ? 'type'
        : specifier.local.type === 'Identifier'
          ? kindOf(specifier.local.name)
          : 'value',
    statement,
  }));
}

const functionsAndClasses = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'ClassExpression',
]);

// `export const` of values that are not functions or classes.
function isPlainConstant(statement: Statement): boolean {
  if (
    statement.type !== 'ExportNamedDeclaration' ||
    statement.declaration?.type !== 'VariableDeclaration' ||
    statement.declaration.kind !== 'const'
  ) {
    return false;
  }
  return statement.declaration.declarations.every(
    (declarator) => declarator.init === null || !functionsAndClasses.has(declarator.init.type),
  );
}

// A Worker's default export: an object literal with a `fetch` handler.
function isWorkerDefault(statement: Statement): boolean {
  if (
    statement.type !== 'ExportDefaultDeclaration' ||
    statement.declaration.type !== 'ObjectExpression'
  ) {
    return false;
  }
  return statement.declaration.properties.some(
    (property) =>
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === 'fetch',
  );
}

/**
 * Reports a file that exports a function, class, or const named other than the file, so each file
 * holds one function or class and a reader finds it by the file's name. Its own types, such as its
 * options and its result, may sit beside it. A file that exports only types exports one with the
 * file's name. A `constants.ts` in a feature's folder, not at the top of `src/`, may export many
 * plain constants of that feature. A default export has no name, and a re-export comes from another
 * file, so both pass, and so does a Worker's file, whose default export is an object with `fetch`
 * and which exports the classes the runtime binds by name.
 */
const oneExportPerFile = {
  meta: {
    type: 'suggestion',
    messages: {
      oneValuePerFile:
        'Export one function, class, or const from this file, named `{{ baseName }}`. Move `{{ name }}` to a file of its own name.',
      typesNamedForFile:
        'This file exports only types, so one of them is named `{{ baseName }}`. Move the others.',
      scopedConstants:
        "A `constants.ts` holds only the plain constants of one feature, in that feature's folder, never at the top of `src/`. Move `{{ name }}`.",
    },
  },
  create: (context) => ({
    Program: (program) => {
      if (/\.d\.[cm]?ts$/.test(context.filename) || program.body.some(isWorkerDefault)) {
        return;
      }
      const baseName = context.filename.replace(/^.*[\\/]/, '').replace(/\.[cm]?[jt]sx?$/, '');
      const declared = new Map<string, Kind>();
      for (const { name, kind } of program.body.flatMap(declaredBy)) {
        declared.set(name, declared.get(name) === 'value' ? 'value' : kind);
      }
      const exported = program.body.flatMap((statement) =>
        exportsOf(statement, (name) => declared.get(name) ?? 'value'),
      );
      const values = exported.filter(({ kind }) => kind === 'value');
      const isScopedConstants =
        baseName === 'constants' && !/[\\/]src[\\/]constants\.[cm]?[jt]sx?$/.test(context.filename);
      for (const { name, statement } of values) {
        if (isScopedConstants && isPlainConstant(statement)) {
          continue;
        }
        if (baseName === 'constants') {
          context.report({ node: statement, messageId: 'scopedConstants', data: { name } });
        } else if (name !== baseName) {
          context.report({
            node: statement,
            messageId: 'oneValuePerFile',
            data: { baseName, name },
          });
        }
      }
      const types = exported.filter(({ kind }) => kind === 'type');
      const hasDefault = program.body.some(
        (statement) => statement.type === 'ExportDefaultDeclaration',
      );
      if (
        values.length === 0 &&
        !hasDefault &&
        types[0] !== undefined &&
        !types.some(({ name }) => name === baseName)
      ) {
        context.report({
          node: types[0].statement,
          messageId: 'typesNamedForFile',
          data: { baseName },
        });
      }
    },
  }),
} satisfies Rule;

// The verbs that may start the name of a flag that asks for an action. A repo adds its own with
// the rule's `verbs` option.
const actionVerbs = ['compress', 'discard', 'drop', 'fill', 'hide', 'hold', 'replace'];

type TypeNode = { type: string; types?: readonly TypeNode[] | undefined };

// `boolean`, or a union of `boolean` with `undefined` or `null`, such as an optional flag.
function isBooleanType(type: TypeNode): boolean {
  if (type.type === 'TSBooleanKeyword') {
    return true;
  }
  const members = (type.type === 'TSUnionType' ? (type.types ?? []) : []).map(({ type }) => type);
  return (
    members.includes('TSBooleanKeyword') &&
    members.every((member) =>
      ['TSBooleanKeyword', 'TSUndefinedKeyword', 'TSNullKeyword'].includes(member),
    )
  );
}

const isBoolean = (annotation: unknown) =>
  isNode(annotation) && isBooleanType(annotation['typeAnnotation'] as TypeNode);

/**
 * Reports a variable, a parameter, or a property of type `boolean` (also with `undefined` or
 * `null`) whose name doesn't start with `is`, `has`, or an action verb, so the name says whether it
 * describes something (`isOnline`) or asks for an action (`compress`). The `verbs` option adds to
 * the verbs in `actionVerbs`.
 */
const booleanName = {
  meta: {
    type: 'suggestion',
    schema: [
      {
        type: 'object',
        properties: { verbs: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      booleanName:
        'Name a boolean that describes something with `is` or `has` (`isOnline`). A flag that asks for an action starts with a verb, such as `compress`; add a verb with the `verbs` option of `defaults/boolean-name`.',
    },
  },
  create: (context) => {
    const [options] = context.options as [{ verbs?: string[] | undefined }?];
    const verbs = new Set([...actionVerbs, ...(options?.verbs ?? [])]);
    const isAllowed = (name: string) =>
      /^(?:is|has)[A-Z]/.test(name) || verbs.has(/^[a-z]+/.exec(name)?.[0] ?? name);
    const check = (key: unknown, annotation: unknown) => {
      if (isNode(key) && key.type === 'Identifier' && isBoolean(annotation)) {
        if (!isAllowed(key['name'] as string)) {
          context.report({ node: key as never, messageId: 'booleanName' });
        }
      }
    };
    return {
      Identifier: (node) => check(node, 'typeAnnotation' in node ? node.typeAnnotation : null),
      TSPropertySignature: (node) => check(node.key, node.typeAnnotation),
      PropertyDefinition: (node) => check(node.key, node.typeAnnotation),
    };
  },
} satisfies Rule;

/**
 * The oxlint rules under the `defaults` prefix. The `lint` settings in `oxc.ts` load the plugin and
 * turn on every rule.
 */
const plugin = {
  meta: { name: 'defaults' },
  rules: {
    'boolean-name': booleanName,
    'import-extension': importExtension,
    'no-enum': noEnum,
    'one-export-per-file': oneExportPerFile,
    'optional-undefined': optionalUndefined,
    'prefer-satisfies': preferSatisfies,
    'type-parameter-name': typeParameterName,
  },
} satisfies Plugin;

type Plugin = {
  meta: { name: string };
  rules: Record<
    | 'boolean-name'
    | 'import-extension'
    | 'no-enum'
    | 'one-export-per-file'
    | 'optional-undefined'
    | 'prefer-satisfies'
    | 'type-parameter-name',
    Rule
  >;
};

export default plugin as Plugin;
