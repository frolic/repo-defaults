import { defineConfig } from 'vite-plus';
import { fmt, lint } from './src/oxc.ts';

export default defineConfig({
  fmt: { ...fmt, ignorePatterns: [...fmt.ignorePatterns, 'dist/**', 'vendor/**', 'skills/**'] },
  lint: {
    ...lint,
    ignorePatterns: [...lint.ignorePatterns, 'vendor/**', 'skills/**'],
    overrides: [
      ...lint.overrides,
      {
        // Node runs these files from a checkout, so their imports name the `.ts` file, and the
        // build rewrites them to `.js`.
        files: ['src/**', 'test/**', 'vite.config.ts'],
        rules: { 'defaults/import-extension': 'off' },
      },
      {
        files: ['src/oxlint.ts'],
        rules: { 'import/no-default-export': 'off' },
      },
      {
        files: ['src/commitMessage.ts', 'src/linkSkills.ts'],
        rules: { 'no-console': 'off' },
      },
    ],
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
