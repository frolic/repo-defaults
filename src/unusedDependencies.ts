import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspacePackages } from './workspacePackages.ts';

const packageNameOf = (specifier: string) =>
  specifier.startsWith('node:')
    ? 'node'
    : specifier
        .split('/')
        .slice(0, specifier.startsWith('@') ? 2 : 1)
        .join('/');

// DefinitelyTyped publishes the types of @scope/name as @types/scope__name.
const packageTypedBy = (dependency: string) =>
  dependency.startsWith('@types/')
    ? dependency.slice('@types/'.length).replace(/^(.+)__(.+)$/, '@$1/$2')
    : dependency;

// The commands and the peers of an installed dependency, read from the package's own node_modules
// as pnpm links it, or from the root's, where npm and yarn hoist it.
const installedManifestOf = (root: string, folder: string, dependency: string) => {
  const path = [folder, '.']
    .map((base) => join(root, base, 'node_modules', dependency, 'package.json'))
    .find((candidate) => existsSync(candidate));
  if (path === undefined) {
    return { commands: [], peers: [] };
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as {
    name?: string | undefined;
    bin?: string | Record<string, string> | undefined;
    peerDependencies?: Record<string, string> | undefined;
  };
  const bin = manifest.bin ?? {};
  return {
    commands:
      typeof bin === 'string'
        ? [(manifest.name ?? dependency).replace(/^@[^/]+\//, '')]
        : Object.keys(bin),
    peers: Object.keys(manifest.peerDependencies ?? {}),
  };
};

/**
 * Returns each dependency that a package of the workspace at `root` lists but doesn't use, as
 * `<folder>: <name>`. A dependency is used when a file of the package imports it, also from a
 * style sheet's `@import` or a tsconfig's `types`; when a script of the package runs a command from
 * its `bin`; or when another dependency of the package needs it as a peer. The DefinitelyTyped package
 * of a dependency counts as used when the package imports that dependency. Install the dependencies first, because commands and peers
 * come from each installed package.json.
 *
 * @example
 * expect(unusedDependencies(root)).toEqual([]);
 */
export function unusedDependencies(root: string): string[] {
  return workspacePackages(root).flatMap(({ folder, files, scripts, dependencies }) => {
    const imported = new Set(
      files.flatMap((file) => file.imports.map(({ specifier }) => packageNameOf(specifier))),
    );
    const words = new Set(scripts.flatMap((script) => script.split(/[\s;&|()]+/)));
    const installed = new Map(
      dependencies.map((dependency) => [dependency, installedManifestOf(root, folder, dependency)]),
    );
    const peers = new Set([...installed.values()].flatMap(({ peers }) => peers));
    const isUsed = (dependency: string) =>
      imported.has(dependency) ||
      imported.has(packageTypedBy(dependency)) ||
      peers.has(dependency) ||
      (installed.get(dependency)?.commands ?? []).some((command) => words.has(command));
    return dependencies
      .filter((dependency) => !isUsed(dependency))
      .map((dependency) => `${folder}: ${dependency}`);
  });
}
