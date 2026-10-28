import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The globs of the `packages:` list in pnpm-workspace.yaml, one `- glob` line each.
const pnpmGlobs = (text: string) => {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^packages:\s*$/.test(line)) + 1;
  if (start === 0) {
    return [];
  }
  const end = lines.findIndex((line, index) => index >= start && /^\S/.test(line));
  return lines
    .slice(start, end === -1 ? undefined : end)
    .flatMap((line) => /^\s+-\s+["']?([^"'#\s!][^"'#\s]*)["']?/.exec(line)?.[1] ?? []);
};

/**
 * Returns the folder of each package in the workspace at `root`, relative to it, with `.` for the
 * root itself. The workspace is the `packages:` list of pnpm-workspace.yaml, or the `workspaces`
 * field of the root package.json, and a folder counts when it holds a package.json.
 *
 * @example
 * workspaceFolders(root); // ['.', 'packages/sdk', 'apps/chat']
 */
export function workspaceFolders(root: string): string[] {
  const pnpm = join(root, 'pnpm-workspace.yaml');
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    workspaces?: string[] | { packages?: string[] | undefined } | undefined;
  };
  const globs = existsSync(pnpm)
    ? pnpmGlobs(readFileSync(pnpm, 'utf8'))
    : Array.isArray(manifest.workspaces)
      ? manifest.workspaces
      : (manifest.workspaces?.packages ?? []);
  const folders = globs
    .flatMap((glob) => globSync(glob, { cwd: root }))
    .filter(
      (folder) =>
        !folder.split(/[\\/]/).includes('node_modules') &&
        existsSync(join(root, folder, 'package.json')),
    )
    .toSorted();
  return ['.', ...new Set(folders)];
}
