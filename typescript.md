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
- Public functions, classes, and constants have JSDoc with an `@example`. Exported types have JSDoc without one, because the function that takes or returns the type already shows it in use.
- Pure functions where possible. Return early. No type casts.

## Comments

Code explains itself through names, types, and small functions. A comment stays only if it is one of these:

- a doc comment that states the contract of an export, such as a unit, a limit, or what a caller must do
- a behavior forced by something you can't change, such as a browser, a database, WebCrypto, or a protocol
- a lint suppression with its reason
- a link to an issue

A comment that explains your own code is a sign the code needs a better name or shape. Fix the code and delete the comment. The `comment-sicko` agent applies this rule, and the `no-comments` skill runs it on a scope.

## Files and names

- One export per file, and the file has its name. A test sits next to its file (`foo.test.ts` beside `foo.ts`).
- No `utils/` folders. Files stay flat in `src/` until a feature's files are used only by that feature, and then a folder named for the feature holds them. A folder never holds one kind of file (`components/`, `hooks/`, `types/`).
- Use full names: `entity`, `attribute`, `page`, not `e`, `attr`, `pg`. A name says what the caller gets, in plain words and the words of the repo's docs.
- A timestamp's name ends in `At` (`addedAt`, `expiresAt`). A boolean that describes something starts with `is` or `has` (`isOnline`, `hasPasskey`). A flag that asks for an action is a verb (`compress`, `discard`).

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

- Prefer end-to-end tests that run the whole stack, as a user or another service calls it. Run the real server or worker runtime against the real storage, or a local copy of it, and call it from the client over the network. They prove that each layer keeps the interface the next one relies on, which a test of one layer with fakes around it can't.
- Use end-to-end tests for performance too. Count what a user waits on, such as requests, round trips, and bytes over the wire, and assert the count, so a change that adds a request fails the test.
- Write a unit test for small, pure logic, such as a parser, an encoder, or a function with many edge cases. A fake or in-memory version of a service can run the same suite as the real one, but it doesn't replace the end-to-end test.
- Assert what a caller can observe. Read the `principle-test-behavior-not-implementation` skill before writing tests.
- A test that compares timings belongs with the benchmarks, because timing tests fail when the machine is loaded. Counts of requests and bytes don't depend on the machine, so they belong in the normal tests.
