#!/usr/bin/env node
// Sets up the repo in the current directory to use repo-defaults, for the steps that need no
// judgment. Each step is skipped when it's already done, so running it again is safe:
//
// - CLAUDE.md imports the rule files, so Claude Code loads them as project instructions.
// - AGENTS.md tells other agents to follow the same files.
// - link-skills links the skills and agents.
// - core.hooksPath points at the shared git hooks, unless the repo has hooks of its own, and the
//   package.json prepare script sets it again in each clone.
// - .claude/settings.json blocks starting a CI run and skipping the hooks, if the repo has none.
// - tsconfig.json extends the strict preset, if the repo has no tsconfig.json yet.
//
// It prints the steps left over, which the setup-repo-defaults skill does.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const host = process.cwd();
const prefix = existsSync(join(host, 'repo-defaults/package.json'))
    ? 'repo-defaults'
    : existsSync(join(host, 'node_modules/repo-defaults/package.json'))
        ? 'node_modules/repo-defaults'
        : undefined;
if (prefix === undefined) {
    throw new Error('Add repo-defaults first, as a submodule at repo-defaults/ or as a git dependency. See SETUP.md.');
}
const submodule = prefix === 'repo-defaults';
const rules = ['writing.md', 'typescript.md', 'principles.md', 'workflow.md'].map((name) => `${prefix}/${name}`);
const done = [];
const skipped = [];
const read = (path) => existsSync(join(host, path)) ? readFileSync(join(host, path), 'utf8') : undefined;
const follow = `Follow the rules in ${rules.slice(0, -1).join(', ')}, and ${rules.at(-1)}. They apply to every change in this repo.`;
const agents = read('AGENTS.md');
if (agents === undefined) {
    writeFileSync(join(host, 'AGENTS.md'), `# Agent guide\n\n${follow}\n`);
    done.push('AGENTS.md created');
}
else if (!agents.includes(follow)) {
    const lines = agents.split('\n');
    const heading = lines.findIndex((line) => line.startsWith('# '));
    lines.splice(heading + 1, 0, '', follow);
    writeFileSync(join(host, 'AGENTS.md'), lines.join('\n'));
    done.push('AGENTS.md points at the rule files');
}
const claude = read('CLAUDE.md');
const imports = [...(existsSync(join(host, 'AGENTS.md')) ? ['AGENTS.md'] : []), ...rules]
    .map((path) => `@${path}`)
    .filter((line) => !claude?.split('\n').includes(line));
if (imports.length) {
    const text = claude === undefined ? '' : `${claude.trimEnd()}\n`;
    writeFileSync(join(host, 'CLAUDE.md'), `${text}${imports.join('\n')}\n`);
    done.push(`CLAUDE.md imports ${imports.join(', ')}`);
}
const linkSkills = submodule
    ? join(host, prefix, 'src/linkSkills.ts')
    : join(host, prefix, 'dist/linkSkills.js');
execFileSync(process.execPath, [linkSkills], { cwd: host, stdio: 'inherit' });
done.push('skills linked');
const git = (...args) => {
    try {
        return execFileSync('git', args, { cwd: host, encoding: 'utf8', stdio: 'pipe' }).trim();
    }
    catch {
        return undefined;
    }
};
const hooks = `${prefix}/hooks`;
const setHooks = `git config core.hooksPath ${hooks}`;
const hooksPath = git('config', 'core.hooksPath');
const gitHooks = git('rev-parse', '--git-path', 'hooks');
if (gitHooks === undefined) {
    skipped.push('git hooks: not a git repo');
}
else if (hooksPath === hooks) {
    // Already set up.
}
else if (hooksPath) {
    skipped.push(`git hooks: core.hooksPath is ${hooksPath}, so call the hooks in ${hooks}/ from there`);
}
else {
    const own = ['pre-commit', 'pre-push', 'commit-msg'].filter((name) => existsSync(join(host, gitHooks, name)));
    if (own.length) {
        skipped.push(`git hooks: ${gitHooks} has ${own.join(', ')}, so merge them into ${hooks}/`);
    }
    else {
        git('config', 'core.hooksPath', hooks);
        done.push(`core.hooksPath is ${hooks}`);
    }
}
const manifest = read('package.json');
if (manifest !== undefined) {
    const json = JSON.parse(manifest);
    const scripts = json.scripts ?? {};
    if (scripts['prepare'] === undefined) {
        json.scripts = { ...scripts, prepare: setHooks };
        writeFileSync(join(host, 'package.json'), `${JSON.stringify(json, null, 2)}\n`);
        done.push(`package.json prepare sets core.hooksPath, so each clone gets the hooks`);
    }
    else if (!scripts['prepare'].includes(setHooks)) {
        skipped.push(`package.json: add \`${setHooks}\` to the prepare script`);
    }
    const missing = ['check:staged', 'check', 'test:changed', 'test', 'test:full'].filter((name) => scripts[name] === undefined);
    if (missing.length) {
        skipped.push(`package.json: add the ${missing.join(', ')} scripts (see workflow.md)`);
    }
}
const settings = join(host, '.claude/settings.json');
if (!existsSync(settings)) {
    mkdirSync(join(host, '.claude'), { recursive: true });
    copyFileSync(join(host, prefix, 'templates/claude/settings.json'), settings);
    done.push('.claude/settings.json blocks starting CI and skipping hooks');
}
else if (!readFileSync(settings, 'utf8').includes('gh workflow run')) {
    skipped.push(`.claude/settings.json: add the deny rules from ${prefix}/templates/claude/settings.json`);
}
const preset = submodule
    ? './repo-defaults/tsconfig/strict.json'
    : 'repo-defaults/tsconfig/strict.json';
const tsconfig = read('tsconfig.json');
if (tsconfig === undefined) {
    writeFileSync(join(host, 'tsconfig.json'), `${JSON.stringify({ extends: preset }, null, 2)}\n`);
    done.push(`tsconfig.json extends ${preset}`);
}
else if (!tsconfig.includes(preset)) {
    skipped.push(`tsconfig.json: extend ${preset}`);
}
console.log(['Done:', ...done.map((line) => `- ${line}`)].join('\n'));
const left = [
    ...skipped,
    'vite.config.ts or .oxlintrc.json: spread the fmt and lint settings',
    'a test that runs the prose checks',
    `CI: copy ${prefix}/templates/github/workflows/ into .github/workflows/, and run CI only on main and in the merge queue`,
];
console.log([
    '',
    'Left to do (ask your agent to run the setup-repo-defaults skill):',
    ...left.map((line) => `- ${line}`),
].join('\n'));
