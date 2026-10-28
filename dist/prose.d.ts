/** Returns the made-up actor phrase in `line`, or `undefined` if it has none. */
export declare function findMadeUpActor(line: string): string | undefined;
/** Returns the first list in `line` without a serial comma, or `undefined` if it has none. */
export declare function findMissingSerialComma(line: string): string | undefined;
/** Returns the first ruled-out word in `line`, or `undefined` if it has none. */
export declare function findRuledOutWord(line: string): string | undefined;
/** Returns the first package name in a code span in `line`, or `undefined` if it has none. */
export declare function findCodePackageName(line: string): string | undefined;
/**
 * Returns the first goal id in `line`, such as `G1`, or `undefined` if it has none. A reader can't
 * look an id up, so prose names the goal in words or links its section. Code spans and text in
 * double quotes are skipped, so a rule can quote the pattern.
 */
export declare function findGoalId(line: string): string | undefined;
/** A check that `check` runs on each line of prose. */
export type Rule = 'made-up-actor' | 'serial-comma' | 'ruled-out-word' | 'code-package-name' | 'goal-id';
/** A line of prose that breaks a rule, with its path relative to `check`'s `root`. */
export type Finding = {
    file: string;
    line: number;
    rule: Rule;
    text: string;
};
/**
 * Returns the Markdown and TypeScript files under `dir`, skipping `node_modules`, `dist`, `.git`,
 * `fixtures`, and every path in `skip`.
 *
 * @example
 * const files = walk(root, { skip: [join(root, 'site/src/pages/packages')] });
 */
export declare function walk(dir: string, options?: walk.Options): string[];
export declare namespace walk {
    type Options = {
        /** Absolute paths of files and directories to leave out. */
        skip?: readonly string[] | undefined;
    };
}
/**
 * Returns the prose in `file`: each Markdown line, and each comment and test name in source, but
 * not the lines in a fenced code block. With `table`, the first cell of each table row is left out.
 *
 * @example
 * const lines = proseLines('README.md');
 */
export declare function proseLines(file: string, options?: proseLines.Options): proseLines.ReturnType;
export declare namespace proseLines {
    type Options = {
        /** Leave out the first cell of each table row, which holds sentences to avoid. */
        table?: boolean | undefined;
    };
    type ReturnType = {
        line: number;
        text: string;
    }[];
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
export declare function check(files: readonly string[], options: check.Options): Finding[];
export declare namespace check {
    type Options = {
        /** The directory that each `Finding.file` is relative to. */
        root: string;
        /**
         * Files whose tables hold sentences to avoid in the first column, as writing.md does. The
         * checks skip that column.
         */
        tables?: readonly string[] | undefined;
        /** Files to leave out of each rule, such as a file that lists the ruled-out words. */
        skip?: Partial<Record<Rule, readonly string[]>> | undefined;
    };
}
/**
 * Returns the number of words in `file`, counted as runs of text between whitespace. A test can
 * cap a doc's length with it, so the doc grows only when someone raises the cap on purpose.
 *
 * @example
 * expect(countWords(join(root, 'docs/design.md'))).toBeLessThanOrEqual(10_000);
 */
export declare function countWords(file: string): number;
