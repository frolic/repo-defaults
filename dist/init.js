#!/usr/bin/env node
// Sets up the repo in the current directory to use repo-defaults, for the steps that need no
// judgment. Each step is skipped when it's already done, so running it again is safe:
//
// - CLAUDE.md imports the rule files, so Claude Code loads them as project instructions.
// - AGENTS.md tells other agents to follow the same files.
// - link-skills links the skills and agents.
// - The commit-msg hook runs check-commit-message, unless the repo already has a commit-msg hook.
// - tsconfig.json extends the strict preset, if the repo has no tsconfig.json yet.
//
// It prints the steps left over, which the setup-repo-defaults skill does.
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const hooks = git('config', 'core.hooksPath') || git('rev-parse', '--git-path', 'hooks');
if (hooks === undefined) {
    skipped.push('commit-msg hook: not a git repo');
}
else {
    const hook = join(host, hooks, 'commit-msg');
    const command = submodule
        ? 'node repo-defaults/src/commitMessage.ts "$1"'
        : 'node node_modules/repo-defaults/dist/commitMessage.js "$1"';
    if (!existsSync(hook)) {
        mkdirSync(join(host, hooks), { recursive: true });
        writeFileSync(hook, `#!/bin/sh\n${command}\n`);
        chmodSync(hook, 0o755);
        done.push(`${hooks}/commit-msg runs check-commit-message`);
    }
    else if (!readFileSync(hook, 'utf8').includes('commitMessage')) {
        skipped.push(`commit-msg hook: ${hooks}/commit-msg exists, so add \`${command}\` to it`);
    }
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
    ...(submodule ? ['CI: pass submodules: true to actions/checkout'] : []),
];
console.log([
    '',
    'Left to do (ask your agent to run the setup-repo-defaults skill):',
    ...left.map((line) => `- ${line}`),
].join('\n'));
