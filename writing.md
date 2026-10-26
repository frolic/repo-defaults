# Writing

Follow these rules in every repo that includes repo-defaults. Read the `technical-writing` and `unslop` skills before you write docs, READMEs, code comments, JSDoc, commit messages, or PR titles and bodies. These rules apply to all of them.

- Write the way you'd explain it to another engineer: in plain, specific words that keep the detail and the reason.
- Use the name that already exists: the symbol in the code, or a standard term a reader knows without looking it up (compare-and-swap, idempotent, B-tree). Don't paraphrase a known idea in a long clause, and don't swap detail for jargon either.
- Prefer the short phrase: "a missing blob", not "a blob that the bucket does not hold".
- Use literal verbs. "Is accepted" or "is stored", never figurative verbs such as "lands", "names", "absorbs", "wins", "rides along", or "stands on", or figurative nouns such as "seam". Don't personify code: a poll "needs" a deadline, it doesn't "want" one.
- Say what a thing does with its own verb: "a reader follows the head", not "the head is what a reader follows". A passive such as "is treated as body content" is fine when the actor is obvious.
- Keep words in the order a person would say them. Write "a CR without a following LF", not "a CR that no LF follows", which makes the reader work out who follows whom. Use the name a thing already has ("continuation lines") instead of describing it with a clause, and put a condition in an "if" or "when" clause instead of packing it into a noun phrase. Rewording an awkward sentence word by word keeps its shape: say the fact again from scratch.
- Don't invent an actor to state a fact or give advice. "An app that supports older browsers adds its own" and "a caller who wants a few tries writes a counter" describe nobody. Talk to the reader ("if you support older browsers, add them yourself") or name the real thing that acts (`Spf.check` reads the clock). This applies to commit messages, PR titles, and PR bodies too. The prose checks (`check` in `src/prose.ts`) reject "a caller who", "an app that", and similar phrases in Markdown and in source, and `check-commit-message` runs the same check on commit messages. Nothing checks a PR title or body, so read them for it before you open or edit a PR.
- Put a comma before the `and` or `or` that ends a list of three or more items: "`crypto.subtle`, `Blob`, and `fetch`", not "`crypto.subtle`, `Blob` and `fetch`". If an item has its own `and` or `or`, separate the items with semicolons or reword the sentence, so the reader can tell where each item ends. The prose checks look for these lists in Markdown, comments, and test names, and `check-commit-message` checks commit messages. The check guesses at lists, so if it flags a sentence that isn't one, reword the sentence until it reads clearly.
- Write package names as plain text, never in a code span or `<code>`, as in "mail builds on mime-headers and @portable/base64" and "the ws package". This covers your own packages, the libraries they replace, and any other npm package. A subpath such as `@portable/streams/node` is an import specifier and stays code, and so does a line of code such as `import * as Base64 from '@portable/base64'`. In JSDoc, TypeScript reads an `@` after a space as the start of a tag, so write the package's short name there instead: "a `Dns.Resolver` from the dns package". The prose checks reject a scoped name in a code span, a code span followed by "package", and a link to a package page whose text is a code span.
- Say what the code does with a value: "stores" or "references", not a vague "names".
- Don't write rules as slogans or aphorisms ("a write lands only on the version it saw"). Name the mechanism.
- No "X. So Y. So Z." chains. Vary sentence length, and keep a cause and its effect in one sentence when they belong together.
- No AI vocabulary (delve, crucial, leverage), no "not just X but Y", no forced groups of three, no em dashes, no filler or hedging, and no clipped fragments with arrows.
- A commit message says why the change is made and what else was considered.
- Keep docs, comments, commit messages, and PR bodies blameless and neutral. Describe what the code does and why, not who asked for it, approved it, or wrote it, and don't name people or private projects and apps. Write "an audit of three apps that use Portable", not the apps' names.

Each row of this table is a pattern to avoid, not only the one sentence. When you or a reviewer finds a new pattern, add a row, using the real sentence where there is one. Most rows come from Portable, which these rules were written for. An example shows a pattern more clearly than a rule does, so add a row for each new pattern instead of only rewording a rule.

| Instead of | Write |
| --- | --- |
| The URL host parser … cuts a host at `/`, `?`, or `#` and percent-decodes, so a domain holding one of those stays as written. (Both "a domain that contains one of those is kept as written" and "`toAscii` returns a domain that contains one of those characters unchanged" keep the problem.) | The URL host parser … cuts a host at `/`, `?`, or `#` and percent-decodes it, so `toAscii` checks for those characters first and returns the domain unchanged if it finds one. |
| A CR that no LF follows is body content. (So does "The canonicalizer keeps a CR that no LF follows as body content.") | A CR without a following LF is treated as body content. |
| It joins a line that does not start a field to the field above it. | Continuation lines are joined to the field above. |
| `parse` skips tags with an unknown type or whose values point outside the data. | `parse` skips a tag if its type is unknown or its values point outside the data. |
| Thrown by `load` for a label that doesn't map to a charset this package can encode. | Thrown by `load` when it doesn't know the label or can't encode its charset. |
| mime-stream lands just before dkim needs it. | We build mime-stream just before dkim needs it. |
| Each text that parses as a key builds back to the same text. | Every key parses back to the same string, so every stored object can be read back. ("Keys round-trip" goes too far, because it drops the detail.) |
| Stored data never names a blob that the bucket does not hold. | Data never references a missing blob. |
| The WHATWG labels `utf-16` and `unicode` name this charset. | The WHATWG labels `utf-16` and `unicode` map to this charset. |
| Bare imports such as @noble/hashes are resolved through the package's `package.json` dependencies; this should be confirmed in a spike with the first crypto package. | We haven't checked yet how JSR resolves @noble/hashes. Check it when the first crypto package is published. |
| Purpose-sized, not function-sized. | A package solves one problem a developer would name, such as splitting a stream into lines. |
| The cheapest way to get byte-exact compatibility, and it doubles as the migration guide's evidence. | Comparing our output with the original library's catches any difference in bytes, and the passing tests show users the migration is safe. |
| The seam between the device and the host. | The interface between the device and the host. |
| A check that reads an address one way while the network stack reads it another is how CVE-2023-42282 and CVE-2024-29415 in ip let `127.1` and `0x7f.1` pass as public. | CVE-2023-42282 and CVE-2024-29415 let `127.1` and `0x7f.1` pass ip's public-address check because the check read them one way and the network stack read them another. |
| The read misses. So the device asks the host. So the page arrives late. | When the read misses, the device asks the host, and the page arrives a round trip later. |
| The cache absorbs the burst of reads. | The cache serves the repeated reads, so the host receives only the first one. |
| WHATWG labels win where iconv-lite disagrees. | Where iconv-lite disagrees with WHATWG, `Charset.normalizeLabel` uses the WHATWG mapping. |
| A comment never holds the address: `(evil@evil.com) Name <good@good.com>` is good.com. | `parseAddresses` never takes the address from a comment: `(evil@evil.com) Name <good@good.com>` parses to `good@good.com`. |
| A poll that checks a slow endpoint wants a deadline for the whole wait. | A poll of a slow endpoint needs a deadline for the whole wait. |
| A rejection with `code` `ENOTFOUND`, `ENODATA`, or `EBADNAME` means there is no key, and any other rejection a temporary DNS error. | `verify` treats a rejection with `code` `ENOTFOUND`, `ENODATA`, or `EBADNAME` as no key, and any other rejection as a temporary DNS error. |
| A `DataCloneError` errors the stream for good. | A `DataCloneError` errors the stream permanently. |
| `encode*`/`decode*` convert encoded-words and back; `parse*`/`format*` read structured values. | `encode*` and `decode*` convert text to encoded-words and back, and `parse*` and `format*` read structured values. |
| A limit on the whole call is what `AbortSignal.timeout` does. | `AbortSignal.timeout` already limits the whole call. |
| Rename and retype the APIs the second review found out of line. | Rename the APIs that don't follow the naming and typing rules in AGENTS.md. (A commit title says what changed, not which review found it.) |
| `encode` must return bytes that decode on their own: a stateful charset has to end in its initial state. | The bytes from each call must decode on their own, so for a stateful charset each call's output has to return to the initial state. |
| The checks catch what fails only in workerd: the first run found that queue and timers created an `AbortController` at the top level, so neither package nor sse or websockets could load. | The checks catch failures that happen only in workerd. Their first run found that queue and timers created an `AbortController` at the top level, so neither of them could load, and neither could sse or websockets, which depend on timers. |
| … because `crypto.subtle`, `Blob` and `fetch` accept that as a `BufferSource`. | … because `crypto.subtle`, `Blob`, and `fetch` accept that as a `BufferSource`. |
| Functions over `crypto.subtle` that take and return bytes: `digest`, `hmac` and `hkdf`, Ed25519 and X25519 keys from 32-byte seeds, PEM key import … (Adding a comma after `hmac` doesn't help, because "Ed25519 and X25519 keys" is one item.) | Functions over `crypto.subtle` that take and return bytes: `digest`, `hmac`, and `hkdf`; Ed25519 and X25519 keys from 32-byte seeds; PEM key import … |
| Packages don't ship polyfills: an app that supports older browsers adds its own. (No one talks about a made-up "app that …" or "caller who …" doing something in the present tense.) | The packages don't include polyfills, so if you support older browsers, you'll need to add them yourself. |
| Hand-written code strips the armor with a regex that often misses CRLF line breaks. | If you strip the armor yourself, the usual regex often misses CRLF line breaks. |
| The time to sign. Schemes without a timestamp ignore it. A `Date` or a `Temporal.Instant`. (A verbless fragment tacked on as its own sentence.) | The time to sign, as a `Date` or a `Temporal.Instant`. Schemes without a timestamp ignore it. |
| `fold` was 7.7× faster than libmime's `foldLines`, `parseHeaders` 3.7× faster than `decodeHeaders`. | `fold` was 7.7× faster than `foldLines`, and `parseHeaders` was 3.7× faster than `decodeHeaders`. |
| Errors the stream with `signal.reason` when aborted, which cancels the source it is piped from. (The "which" has no clear antecedent.) | Aborting errors the stream with `signal.reason` and cancels the source piped into it. |
| An option you leave out keeps its current value. (The option is made the actor.) | It changes only the options you pass. |
| A forwarder, such as a mailing list, validates the chain that arrived and seals the message. (A made-up actor carries the advice.) | If you forward mail, as a mailing list does, verify the chain that arrived and seal the message. |
| Stripe's `stripe` package has separate builds … Errors extend the classes in `@portable/errors`. | Stripe's stripe package has separate builds … Errors extend the classes in @portable/errors. |

## Prose review

Before you finish a change that adds or edits prose, run the `prose-review` skill. A second agent reads only the prose the change adds or edits, checks it against this file, and suggests rewrites. When you also run `interrogate`, run this skill as well, because `interrogate` reviews the code and not the prose.
