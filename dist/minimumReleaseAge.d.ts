/**
 * Returns the minimum release age that pnpm enforces in the repo at `root`, in minutes, or
 * `undefined` if the repo sets none. pnpm refuses to install a version younger than this, so a
 * hijacked release is found and pulled before the repo installs it. It reads `minimumReleaseAge`
 * in pnpm-workspace.yaml, and then `minimum-release-age` in .npmrc.
 *
 * @example
 * expect(minimumReleaseAge(root)).toBeGreaterThanOrEqual(14 * 24 * 60);
 */
export declare function minimumReleaseAge(root: string): number | undefined;
