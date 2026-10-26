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
