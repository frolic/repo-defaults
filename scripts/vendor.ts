// Copies other repos into vendor/<name>, and records each one and its commit in vendor.json.
//
//   node scripts/vendor.ts add <name> <repo> [--ref <branch>] [--path <dir>]
//   node scripts/vendor.ts update [<name> ...]
//
// `add` copies the repo, or only its <dir> with --path, into vendor/<name>. `update` replaces
// vendor/<name> with the newest commit of each named source, or of every source. Each source is
// one commit with its files and its vendor.json entry. The copy reads nothing from this repo's
// history, so it works after a squash merge. Both commands need a clean working tree, because
// they commit.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Source = {
  repo: string;
  ref: string;
  path?: string | undefined;
  commit: string;
  link: { skills: string[]; agents: string[] };
};

// Run from the repo root, as `pnpm vendor` does.
const root = process.cwd();
const manifest = join(root, 'vendor.json');

const git = (...args: readonly string[]) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

function readManifest(): Record<string, Source> {
  return JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, Source>;
}

// Fetches the newest commit of `source`, and returns it with the tree to copy.
function fetch(source: Pick<Source, 'repo' | 'ref' | 'path'>) {
  git('fetch', '--quiet', '--depth=1', source.repo, source.ref);
  const commit = git('rev-parse', 'FETCH_HEAD');
  return { commit, tree: source.path === undefined ? commit : `${commit}:${source.path}` };
}

// Replaces vendor/<name> with `tree`, and commits it with the new vendor.json.
function copy(name: string, tree: string, sources: Record<string, Source>, message: string) {
  git('rm', '-r', '-f', '--quiet', '--ignore-unmatch', `vendor/${name}`);
  git('read-tree', `--prefix=vendor/${name}/`, '-u', tree);
  writeFileSync(manifest, `${JSON.stringify(sources, null, 2)}\n`);
  git('add', 'vendor.json');
  git('commit', '--quiet', '-m', message);
}

const [command, ...args] = process.argv.slice(2);

if (git('status', '--porcelain')) {
  throw new Error('Commit or stash your changes first, because the vendor commands commit.');
}

if (command === 'add') {
  const [name, repo] = args;
  const option = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  if (name === undefined || repo === undefined) {
    throw new Error(
      'Usage: node scripts/vendor.ts add <name> <repo> [--ref <branch>] [--path <dir>]',
    );
  }
  const sources = readManifest();
  if (sources[name]) {
    throw new Error(`vendor/${name} already exists. Run \`update ${name}\` instead.`);
  }
  const source = { repo, ref: option('--ref') ?? 'main', path: option('--path') };
  const { commit, tree } = fetch(source);
  sources[name] = { ...source, commit, link: { skills: [], agents: [] } };
  copy(name, tree, sources, `Vendor ${name} from ${repo} at ${commit.slice(0, 12)}`);
  console.log(`Added vendor/${name} at ${commit}.`);
} else if (command === 'update') {
  const sources = readManifest();
  const names = args.length ? args : Object.keys(sources);
  for (const name of names) {
    const source = sources[name];
    if (!source) {
      throw new Error(`vendor.json has no source named ${name}.`);
    }
    const { commit, tree } = fetch(source);
    if (commit === source.commit) {
      console.log(`vendor/${name} is already at ${commit}.`);
      continue;
    }
    sources[name] = { ...source, commit };
    copy(name, tree, sources, `Update ${name} to ${commit.slice(0, 12)}`);
    console.log(`Updated vendor/${name} to ${commit}.`);
  }
} else {
  throw new Error('Usage: node scripts/vendor.ts add|update ...');
}
