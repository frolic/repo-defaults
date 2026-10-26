# Shared by the hooks in this folder. `run <script>` runs a package.json script if the repo has one,
# with pnpm when the repo has pnpm-lock.yaml and npm otherwise, so a repo opts in to each step by
# adding the script.
[ -x "$HOME/bin/node" ] && PATH="$HOME/bin:$PATH"

run() {
  if node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$1" 2>/dev/null; then
    if [ -f pnpm-lock.yaml ]; then
      pnpm run --silent "$1"
    else
      npm run --silent "$1"
    fi
  fi
}

# Worktrees share one machine, so hooks that run the tests take turns.
lock() {
  if command -v flock >/dev/null; then
    exec 9>"$(git rev-parse --git-common-dir)/repo-defaults-hook.lock"
    flock 9
  fi
}
