# Principles

Follow these when you design a change, in every repo that includes repo-defaults. The `principle-*` skills from pstack go into each one in more depth.

- Prefer a structural fix over a special rule for one case. A second path that does the same job as an existing one is a design problem.
- Use the platform. Let the database, WebCrypto, and the web APIs (fetch, streams, IndexedDB, WebAuthn) do what they already do, and write your own code only where the platform has no answer.
- Keep it simple, with boundaries that compose. Each part does one job behind a small interface, and parts join through those interfaces. When two designs meet the goal, choose the simpler one.
- Remove before you add. Delete dead code, unused options, and guards for cases that can't occur.
- Make wrong states impossible to build. Use a tagged union instead of optional fields or flags whose valid combinations need a comment.
- Validate outside data once, where it enters. Inside, trust the types.
- Keep I/O, time, and randomness at the edges, and pass them in as arguments, so a test can fix them.
- Measure a performance claim in requests, round trips, and bytes over the wire, with realistic data, and say what the test data is.
- A bug fix names the invariant it broke, in its test name and in its commit message.

## When to zoom out

These signs say the design above a fix is wrong:

- The same part needs a third fix or exception, or two fixes in a row failed.
- A doc needs an exception written into a promise.
- A performance budget has to go up.
- A promise is hard to test.
- A second path does the same job as an existing one.

When one appears, attack the premise. Write down in one sentence what the failed fixes assumed, and test whether it holds. If it doesn't, prototype two or three designs against the interface and its tests, and keep the one that removes the most code and the most rules a reader must know. The result is an interface change, a cut, or a note on why the current shape is right. The size of a package isn't a sign on its own.
