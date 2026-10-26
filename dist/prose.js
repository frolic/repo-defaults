import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
// Finds prose built around a made-up actor, such as "an app that supports older browsers adds its
// own" or "a caller who wants a few tries writes a counter". Say "if you support older browsers,
// add them yourself" instead. Text in double quotes is skipped, so a rule can quote the pattern.
const pattern = /\b(?:an?|any|each|every) (?:app|application|caller|user|program|developer|consumer)s? (?:that|who) /i;
/** Returns the made-up actor phrase in `line`, or `undefined` if it has none. */
export function findMadeUpActor(line) {
    return pattern.exec(line.replaceAll(/"[^"]*"/g, ''))?.[0];
}
// Finds a list of three or more items without a comma before the last `and` or `or`, such as
// "`fetch`, `Request` and `Response`". An item is a code span, a quotation, a Markdown link, or up
// to three words, and the text inside code spans, quotations, and links isn't checked. The check
// doesn't parse sentences, so it skips a match if it may be a series of clauses rather than a list:
//
// - a later item starts with a word in `clauseStarts` or with a participle, or has a word in
//   `prepositions` after its first word, as in "`exports`, whether or not" and "the header, sorted
//   by name and then",
// - the sentence starts with a word in `openers`, and the match has one middle item and starts
//   before the sentence's first comma, as in "When it aborts, `encode` and `decode` reject".
//
// It misses some lists in exchange, such as "In Node, Bun and Deno".
const word = String.raw `(?:\x60[^\x60]+\x60|"[^"]+"|(?!(?:and|or)\b)[\p{L}\p{N}][\p{L}\p{N}.+'’/_-]*)`;
const item = String.raw `${word}(?: ${word}){0,2}`;
const list = new RegExp(String.raw `(?<![\p{L}\p{N},\x60'’.+/_-])(${item})((?:, ${item})+) (?:and|or) ${word}`, 'gu');
const clauseStarts = new Set('about across after against all also although and any apart as at because before between both but by each either even every except for from he if in including instead into it its just like neither never no nor not of on only or over per plus she since so such than that then there these they this those though through to under unless unlike until up versus via we when whenever where whereas whether which while who whom whose with within without yet you'.split(' '));
const prepositions = new Set('at by etc. for from in into of on over per to under via with without'.split(' '));
const openers = new Set('after although as at because before by during for from if in on once since though to unless until when whenever where while with without'.split(' '));
/** Returns the first list in `line` without a serial comma, or `undefined` if it has none. */
export function findMissingSerialComma(line) {
    const text = line
        .replaceAll(/\x60[^\x60]*\x60/g, (span) => `\x60${'x'.repeat(span.length - 2)}\x60`)
        .replaceAll(/"[^"]*"/g, (quote) => `"${'x'.repeat(quote.length - 2)}"`)
        .replaceAll(/\[[^\]]*\]\([^)]*\)/g, (link) => 'x'.repeat(link.length));
    list.lastIndex = 0;
    let match;
    while ((match = list.exec(text))) {
        list.lastIndex = match.index + 1;
        const middles = match[2].slice(2).split(', ');
        const clause = middles.some((middle) => {
            const words = middle.split(' ');
            return (clauseStarts.has(words[0].toLowerCase()) ||
                (words.length > 1 && /(?:ed|ing)$/.test(words[0])) ||
                words.slice(1).some((word) => prepositions.has(word)));
        });
        if (clause) {
            continue;
        }
        const sentence = text
            .slice(0, match.index)
            .split(/[.:;!?(|][*_]*\s/)
            .at(-1);
        const opener = `${sentence} ${match[1]}`.match(/\p{L}+/u)?.[0]?.toLowerCase() ?? '';
        if (middles.length === 1 && openers.has(opener) && !sentence.includes(',')) {
            continue;
        }
        return line.slice(match.index, match.index + match[0].length);
    }
    return undefined;
}
// Matches an em dash, a word from the AI vocabulary list, or a figurative word from writing.md. `findRuledOutWord` removes code spans and double-quoted text before
// matching, so a rule can quote these words.
const ruledOut = /—|\b(?:delve[sd]?|crucial|leverage[sd]?|lands|landed|absorbs?|rides along|stands on|seams?)\b/iu;
/** Returns the first ruled-out word in `line`, or `undefined` if it has none. */
export function findRuledOutWord(line) {
    return ruledOut.exec(line.replaceAll(/\x60[^\x60]*\x60/g, '').replaceAll(/"[^"]*"/g, ''))?.[0];
}
// Finds a package name in a code span: a scoped name such as `@portable/streams`, a name followed
// by "package", as in "the `ws` package", or a link to a package page with the name as its text.
// Package names are plain text in prose. A subpath such as `@portable/streams/node` is an import
// specifier, so it stays code. Text in double quotes is skipped, so a rule can quote the pattern.
const codePackage = /\x60@[a-z0-9-]+\/[a-z0-9._-]+\x60|\x60[@a-z0-9._/-]+\x60 packages?\b|\[\x60([a-z0-9-]+)\x60\]\((?:\/packages\/|\.\.\/)\1\b/;
/** Returns the first package name in a code span in `line`, or `undefined` if it has none. */
export function findCodePackageName(line) {
    return codePackage.exec(line.replaceAll(/"[^"]*"/g, ''))?.[0];
}
const finders = {
    'made-up-actor': findMadeUpActor,
    'serial-comma': findMissingSerialComma,
    'ruled-out-word': findRuledOutWord,
    'code-package-name': findCodePackageName,
};
/**
 * Returns the Markdown and TypeScript files under `dir`, skipping `node_modules`, `dist`, `.git`,
 * `fixtures`, and every path in `skip`.
 *
 * @example
 * const files = walk(root, { skip: [join(root, 'site/src/pages/packages')] });
 */
export function walk(dir, options = {}) {
    const { skip = [] } = options;
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (['node_modules', 'dist', '.git', 'fixtures'].includes(entry.name)) {
            return [];
        }
        const path = join(dir, entry.name);
        if (skip.includes(path)) {
            return [];
        }
        if (entry.isDirectory()) {
            return walk(path, options);
        }
        return /\.(?:md|mdx|ts)$/.test(entry.name) ? [path] : [];
    });
}
const testName = /\b(?:describe|it|test)(?:\.\w+)*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/;
/**
 * Returns the prose in `file`: each Markdown line, and each comment and test name in source, but
 * not the lines in a fenced code block. With `table`, the first cell of each table row is left out.
 *
 * @example
 * const lines = proseLines('README.md');
 */
export function proseLines(file, options = {}) {
    const lines = [];
    const markdown = /\.mdx?$/.test(file);
    let fenced = false;
    readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
        const comment = markdown ? undefined : /^\s*(?:\/\/|\/\*\*|\*)(.*)$/.exec(line)?.[1];
        const text = markdown ? line : comment;
        if (text !== undefined && /^\s*(?:```|~~~)/.test(text)) {
            fenced = !fenced;
            return;
        }
        if (fenced) {
            return;
        }
        const name = markdown ? undefined : testName.exec(line)?.[2];
        for (const prose of [text, name]) {
            if (prose === undefined) {
                continue;
            }
            const cells = options.table === true && prose.startsWith('|');
            lines.push({ line: index + 1, text: cells ? prose.slice(prose.indexOf('|', 1)) : prose });
        }
    });
    return lines;
}
/**
 * Runs every rule on the prose in `files` and returns the lines that break one. The made-up actor
 * check reads every line, code included, because error messages are prose too. The other checks
 * read only the lines from `proseLines`.
 *
 * @example
 * const findings = check(walk(root), {
 *   root,
 *   tables: [join(root, 'AGENTS.md')],
 *   skip: { 'ruled-out-word': [join(root, 'AGENTS.md')] },
 * });
 */
export function check(files, options) {
    const { root, tables = [], skip = {} } = options;
    const findings = [];
    for (const file of files) {
        const table = tables.includes(file);
        const rules = Object.keys(finders).filter((rule) => !(skip[rule] ?? []).includes(file));
        const report = (rule, line, text) => {
            if (text !== undefined) {
                findings.push({ file: relative(root, file), line, rule, text });
            }
        };
        if (rules.includes('made-up-actor')) {
            readFileSync(file, 'utf8')
                .split('\n')
                .forEach((line, index) => {
                if (!(table && line.startsWith('|'))) {
                    report('made-up-actor', index + 1, findMadeUpActor(line));
                }
            });
        }
        for (const { line, text } of proseLines(file, { table })) {
            for (const rule of rules) {
                if (rule !== 'made-up-actor') {
                    report(rule, line, finders[rule](text));
                }
            }
        }
    }
    return findings;
}
