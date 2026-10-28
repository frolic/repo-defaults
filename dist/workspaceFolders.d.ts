/**
 * Returns the folder of each package in the workspace at `root`, relative to it, with `.` for the
 * root itself. The workspace is the `packages:` list of pnpm-workspace.yaml, or the `workspaces`
 * field of the root package.json, and a folder counts when it holds a package.json.
 *
 * @example
 * workspaceFolders(root); // ['.', 'packages/sdk', 'apps/chat']
 */
export declare function workspaceFolders(root: string): string[];
