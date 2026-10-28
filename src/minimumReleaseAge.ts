import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Returns the minimum release age that pnpm enforces in the repo at `root`, in minutes, or
 * `undefined` if the repo sets none. pnpm refuses to install a version younger than this, so a
 * hijacked release is found and pulled before the repo installs it. It reads `minimumReleaseAge`
 * in pnpm-workspace.yaml, and then `minimum-release-age` in .npmrc.
 *
 * @example
 * expect(minimumReleaseAge(root)).toBeGreaterThanOrEqual(14 * 24 * 60);
 */
export function minimumReleaseAge(root: string): number | undefined {
  const sources = [
    { file: 'pnpm-workspace.yaml', pattern: /^minimumReleaseAge:\s*(\d+)\s*(?:#.*)?$/m },
    { file: '.npmrc', pattern: /^minimum-release-age\s*=\s*(\d+)\s*$/m },
  ];
  for (const { file, pattern } of sources) {
    const path = join(root, file);
    const minutes = existsSync(path) ? pattern.exec(readFileSync(path, 'utf8'))?.[1] : undefined;
    if (minutes !== undefined) {
      return Number(minutes);
    }
  }
  return undefined;
}
