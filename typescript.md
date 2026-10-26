# TypeScript

Follow these rules in every TypeScript repo that includes repo-defaults. Most of the style follows [wevm/ox](https://github.com/wevm/ox/blob/main/AGENTS.md). Where a rule names a check, the `lint` settings in `src/oxc.ts` turn it on, and the `tsconfig/strict.json` preset sets the compiler options the rules assume.

## Style

- `type` over `interface`. `readonly T[]` in types, never `Array<T>` or `ReadonlyArray<T>` (`typescript/array-type` checks this). No enums (`defaults/no-enum`).
- Write `const name = value satisfies Type`, not `const name: Type = value`, so the constant keeps the type TypeScript infers. An annotation is still right on an empty collection, as in `const chunks: Uint8Array[] = []`, because `[] satisfies Uint8Array[]` infers `never[]`, and when the wider type is the point: `unknown`, `unique symbol`, an index signature (such as a `Record`) that a lookup reads with any string, an object that the code later writes properties to or that refers to itself, an exported constant, or a value read through a wider view. `defaults/prefer-satisfies` checks this.
- Name a type parameter with a lowercase word that says what it holds, such as `chunk`, `value`, or `key`, not `T` or `Chunk`. `defaults/type-parameter-name` checks this.
- Options objects are `options: Options = {}` and are typed in a `declare namespace` named after the function or class (`DecoderStream.Options`).
- With `exactOptionalPropertyTypes`, write optional properties as `foo?: T | undefined`. `defaults/optional-undefined` checks this and fixes it.
- Relative imports end in `.js` (`defaults/import-extension`). If Node runs the files directly from source, import the `.ts` file instead, turn the rule off for those files, and build with `rewriteRelativeImportExtensions`.
- Statements end with semicolons, and so do the statements in examples. oxfmt adds them to code (`semi: true` in the `fmt` settings), but it doesn't format examples in Markdown or JSDoc.
- Every `if`, `else`, and loop body goes in braces, even a one-line early `return`, and so do the bodies in examples. The `curly` lint rule checks the code.
- A helper that throws for an invalid value and otherwise returns nothing or the same value is named `assert*`, such as `assertSize` and `assertUint8Array`. A helper that also changes the value, such as trimming it or converting a domain to its A-label, is named for the change: `normalizeName`, `formatAddress`.
- Use classes only for errors and for subclasses of platform types, such as a `TransformStream` subclass.
- Named exports only (`import/no-default-export`). A config file or an oxlint plugin that must export a default is the exception.
- Public functions, classes, and constants have JSDoc with an `@example`. Exported types have JSDoc without one, because the function that takes or returns the type already shows it in use. Other comments are rare: write one only when the code can't say why, and run the `no-comments` skill before you finish a change.

## API shape

- A function that returns a boolean starts with `is`, `has`, or `can`, unless a standard name exists, such as `equal`.
- Choose parameters with these three rules, in order:
  - When a function is the analogue of a platform function, copy that function's signature.
  - The value being converted or acted on is positional, followed by one optional `options` object: `encode(bytes, options)`, `debounce(fn, ms)`, `equal(a, b)`.
  - Inputs with distinct roles go in one object: `send({ subscription, payload, vapid })`. Start with the object form if a function might later need another such input, because moving from positionals to an object breaks callers and adding an option doesn't.

  Outside the platform case there are no optional positionals, no rest parameters, no positional that accepts `undefined`, no positional booleans and no overloads keyed on argument count or on an option's value. When an option would change the result type, write two functions instead.
- Functions are sync unless an API they need is async.
- Durations are milliseconds unless the wire format sets the unit.
- Everything that can be cancelled takes `signal?: AbortSignal | undefined` in its options. Aborting rejects with `signal.reason`, as `fetch` does. Timeouts are left to `AbortSignal.timeout` and `AbortSignal.any` rather than a `timeout` option.
- Errors are thrown, never returned. An error thrown in place of another error passes the original as `cause`. Throw `TypeError` when an argument has the wrong type or is missing, and `RangeError` when it has the right type but a value the function doesn't accept. Add an error class only when a caller needs to tell it apart.
- Results are plain objects and arrays with documented types, not class instances.
- A function's result type is `fn.ReturnType` in the function's namespace. For an async function it is the resolved value: `send(): Promise<send.ReturnType>`.

## Tests

- Assert what a caller can observe. Read the `principle-test-behavior-not-implementation` skill before writing tests.
- A test that compares timings belongs with the benchmarks, because timing tests fail when the machine is loaded.
