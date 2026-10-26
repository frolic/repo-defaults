// Vendors other repos into vendor/<name> with git subtree, and records each one in vendor.json.
//
//   node scripts/vendor.ts add <name> <repo> [--ref <branch>] [--path <dir>]
//   node scripts/vendor.ts update [<name> ...]
//
// `add` copies the repo, or only its <dir> with --path, into vendor/<name> as one squashed commit.
// `update` pulls the newest commit of each named source, or of every source, the same way. With
// --path, the script first runs `git subtree split` on a clone of the repo, so vendor/<name> holds
// only that directory. Both commands need a clean working tree, because git subtree commits.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Source = {
  repo: string;
  ref: string;
  path?: string | undefined;
  commit: string;
  link: { skills: string[]; agents: string[] };
};

const root = join(import.meta.dirname, '..');
const manifest = join(root, 'vendor.json');

const git = (args: readonly string[], cwd = root) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

function readManifest(): Record<string, Source> {
  return JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, Source>;
}

function writeManifest(sources: Record<string, Source>, message: string) {
  writeFileSync(manifest, `${JSON.stringify(sources, null, 2)}\n`);
  git(['add', 'vendor.json']);
  git(['commit', '--quiet', '-m', message]);
}

// Clones the source and returns the clone, the branch to pull from it, and the upstream commit.
function fetch(source: Pick<Source, 'repo' | 'ref' | 'path'>) {
  const dir = mkdtempSync(join(tmpdir(), 'vendor-'));
  // `git subtree split` checks that the directory exists in the working tree, so only a clone
  // without --path can skip the checkout.
  const checkout = source.path === undefined ? ['--no-checkout'] : [];
  git(['clone', '--quiet', ...checkout, '--branch', source.ref, source.repo, dir]);
  const commit = git(['rev-parse', 'HEAD'], dir);
  if (source.path === undefined) {
    return { dir, branch: source.ref, commit };
  }
  git(['subtree', 'split', '--quiet', `--prefix=${source.path}`, '-b', 'vendor-split'], dir);
  return { dir, branch: 'vendor-split', commit };
}

function assertClean() {
  if (git(['status', '--porcelain'])) {
    throw new Error('Commit or stash your changes first, because git subtree commits.');
  }
}

const [command, ...args] = process.argv.slice(2);

if (command === 'add') {
  const [name, repo] = args;
  const option = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  if (name === undefined || repo === undefined) {
    throw new Error('Usage: node scripts/vendor.ts add <name> <repo> [--ref <branch>] [--path <dir>]');
  }
  assertClean();
  const sources = readManifest();
  if (sources[name]) {
    throw new Error(`vendor/${name} already exists. Run \`update ${name}\` instead.`);
  }
  const source = { repo, ref: option('--ref') ?? 'main', path: option('--path') };
  const { dir, branch, commit } = fetch(source);
  git([
    'subtree',
    'add',
    '--quiet',
    `--prefix=vendor/${name}`,
    dir,
    branch,
    '--squash',
    '-m',
    `Vendor ${name} from ${repo} at ${commit.slice(0, 12)}`,
  ]);
  rmSync(dir, { recursive: true, force: true });
  sources[name] = { ...source, commit, link: { skills: [], agents: [] } };
  writeManifest(sources, `Record ${name} in vendor.json`);
  console.log(`Added vendor/${name} at ${commit}.`);
} else if (command === 'update') {
  assertClean();
  const sources = readManifest();
  const names = args.length ? args : Object.keys(sources);
  for (const name of names) {
    const source = sources[name];
    if (!source) {
      throw new Error(`vendor.json has no source named ${name}.`);
    }
    const { dir, branch, commit } = fetch(source);
    if (commit === source.commit) {
      console.log(`vendor/${name} is already at ${commit}.`);
      rmSync(dir, { recursive: true, force: true });
      continue;
    }
    git([
      'subtree',
      'pull',
      '--quiet',
      `--prefix=vendor/${name}`,
      dir,
      branch,
      '--squash',
      '-m',
      `Update ${name} to ${commit.slice(0, 12)}`,
    ]);
    rmSync(dir, { recursive: true, force: true });
    sources[name] = { ...source, commit };
    writeManifest(sources, `Record ${name} at ${commit.slice(0, 12)} in vendor.json`);
    console.log(`Updated vendor/${name} to ${commit}.`);
  }
} else {
  throw new Error('Usage: node scripts/vendor.ts add|update ...');
}
