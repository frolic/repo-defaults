/**
 * Returns each row of a corrections log, such as `.claude/corrections.md`, that was seen twice or
 * more but names no check in its `Enforced by` column: an empty cell, or one that starts with
 * "nothing", as in "nothing yet". A test of the log fails until each repeated correction has a
 * check, as workflow.md asks. The log is a Markdown table with `Correction`, `Seen`, and `Enforced
 * by` columns, as in `templates/claude/corrections.md`. Throws a `TypeError` if the file has no
 * such table.
 *
 * @example
 * expect(unenforcedCorrections(join(root, '.claude/corrections.md'))).toEqual([]);
 */
export declare function unenforcedCorrections(file: string): unenforcedCorrections.ReturnType;
export declare namespace unenforcedCorrections {
    type ReturnType = {
        line: number;
        correction: string;
        seen: number;
    }[];
}
