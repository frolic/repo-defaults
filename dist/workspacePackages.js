import { globSync, readFileSync } from 'node:fs';
import { basename, join, posix } from 'node:path';
import ts from 'typescript';
import { moduleImports } from "./moduleImports.js";
import { workspaceFolders } from "./workspaceFolders.js";
const ignored = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.turbo']);
const styleSheetImports = (text) => [...text.matchAll(/@(?:import|plugin|reference)\s+["']([^"']+)["']/g)].map(([, specifier]) => ({
    specifier: specifier ?? '',
    names: undefined,
}));
const tsconfigTypes = (text) => {
    const config = ts.parseConfigFileTextToJson('tsconfig.json', text).config;
    const types = config?.compilerOptions?.types;
    return (Array.isArray(types) ? types : []).map((specifier) => ({
        specifier: String(specifier),
        names: undefined,
    }));
};
const importsOf = (path, text) => {
    if (path.endsWith('.css')) {
        return styleSheetImports(text);
    }
    if (path.endsWith('.json')) {
        return tsconfigTypes(text);
    }
    return moduleImports(path, text);
};
/**
 * Reads each package of the workspace at `root`: its folder, its manifest, and what each of its
 * source, style sheet, and tsconfig files imports. A style sheet imports with `@import`, `@plugin`,
 * or `@reference`, and a tsconfig with each name in `compilerOptions.types`. The root package
 * leaves out the folders of the other packages.
 *
 * @example
 * const packages = workspacePackages(root);
 */
export function workspacePackages(root) {
    const folders = workspaceFolders(root);
    return folders.map((folder) => {
        const others = folders.filter((other) => other !== folder && other !== '.');
        const manifest = JSON.parse(readFileSync(join(root, folder, 'package.json'), 'utf8'));
        const files = globSync('**/{*.ts,*.tsx,*.mts,*.cts,*.js,*.jsx,*.mjs,*.cjs,*.css,tsconfig*.json}', {
            cwd: join(root, folder),
            exclude: (path) => ignored.has(basename(path)),
        })
            .map((path) => posix.join(folder, path.replaceAll('\\', '/')))
            .filter((path) => folder !== '.' || !others.some((other) => path.startsWith(`${other}/`)))
            .map((path) => ({ path, imports: importsOf(path, readFileSync(join(root, path), 'utf8')) }));
        return {
            folder,
            name: manifest.name ?? folder,
            exports: manifest.exports,
            scripts: Object.values(manifest.scripts ?? {}),
            dependencies: [
                ...new Set([
                    ...Object.keys(manifest.dependencies ?? {}),
                    ...Object.keys(manifest.devDependencies ?? {}),
                ]),
            ],
            files,
        };
    });
}
