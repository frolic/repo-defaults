import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceFolders } from "./workspaceFolders.js";
// An exact version, such as `4.0.2` or `2.0.0-beta.81`; a version that pnpm resolves elsewhere
// (`catalog:`, `workspace:*`); or a git or local dependency, which only an update moves.
const isPinned = (specifier) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(specifier) ||
    specifier.startsWith('catalog:') ||
    specifier === 'workspace:*' ||
    /^(?:github:|git\+|git:|file:|link:)/.test(specifier);
const sections = ['dependencies', 'devDependencies', 'optionalDependencies'];
// The entries of the `catalog:` map and of each map under `catalogs:` in pnpm-workspace.yaml.
const catalogEntries = (text) => {
    const entries = [];
    let section;
    for (const line of text.split('\n')) {
        if (/^\S/.test(line)) {
            section = /^catalog:\s*$/.test(line)
                ? 'catalog'
                : /^catalogs:\s*$/.test(line)
                    ? 'catalogs'
                    : undefined;
            continue;
        }
        const indent = section === 'catalog' ? 2 : 4;
        const match = new RegExp(`^ {${indent}}["']?([^"':]+)["']?:\\s*["']?([^"'\\s#]+)`).exec(line);
        if (section !== undefined && match !== null) {
            entries.push({ name: match[1] ?? '', version: match[2] ?? '' });
        }
    }
    return entries;
};
/**
 * Returns each dependency in the workspace at `root` that names a range, such as `^4.1.0` or
 * `~5.9.3`, instead of an exact version, as `<file> <section>: <name> <range>`. It reads the
 * `dependencies`, `devDependencies`, and `optionalDependencies` of every package.json in the
 * workspace, and the catalogs of pnpm-workspace.yaml. A peer dependency stays a range, because it
 * says what the package works with. `catalog:`, `workspace:*`, and a git or local dependency count
 * as exact, because only an update changes what they install.
 *
 * @example
 * expect(versionRanges(root)).toEqual([]);
 */
export function versionRanges(root) {
    const manifests = workspaceFolders(root).flatMap((folder) => {
        const file = folder === '.' ? 'package.json' : `${folder}/package.json`;
        const manifest = JSON.parse(readFileSync(join(root, file), 'utf8'));
        return sections.flatMap((section) => Object.entries(manifest[section] ?? {})
            .filter(([, specifier]) => !isPinned(specifier))
            .map(([name, specifier]) => `${file} ${section}: ${name} ${specifier}`));
    });
    const workspace = join(root, 'pnpm-workspace.yaml');
    const catalog = existsSync(workspace)
        ? catalogEntries(readFileSync(workspace, 'utf8'))
            .filter(({ version }) => !isPinned(version))
            .map(({ name, version }) => `pnpm-workspace.yaml catalog: ${name} ${version}`)
        : [];
    return [...manifests, ...catalog];
}
