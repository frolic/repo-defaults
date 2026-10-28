import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { findInPlaceEdit } from '../src/findInPlaceEdit.ts';

const root = join(import.meta.dirname, '..');

const hook = (command: string) =>
  spawnSync(process.execPath, [join(root, 'src/refuseInPlaceEdits.ts')], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  });

test('findInPlaceEdit finds sed -i, perl -i, and scripts that write files', () => {
  expect(findInPlaceEdit("sed -i 's/a/b/' notes.md")).toBe('sed -i');
  expect(findInPlaceEdit("sed --in-place -e 's/a/b/' notes.md")).toBe('sed -i');
  expect(findInPlaceEdit("perl -pi -e 's/a/b/' notes.md")).toBe('perl -i or ruby -i');
  expect(findInPlaceEdit("python3 -c \"open('a.md', 'w').write('x')\"")).toBe(
    'a python or node script that writes files',
  );
  expect(findInPlaceEdit("node -e \"require('fs').writeFileSync('a.md', 'x')\"")).toBe(
    'a python or node script that writes files',
  );
});

test('findInPlaceEdit allows commands that only read or print', () => {
  expect(findInPlaceEdit("sed -n '1,20p' notes.md")).toBeUndefined();
  expect(findInPlaceEdit("grep -n 'sed -i' notes.md | head")).toBeUndefined();
  expect(findInPlaceEdit('python3 -c "import sys; sys.stdout.write(\'x\')"')).toBeUndefined();
  expect(findInPlaceEdit('node scripts/vendor.ts update')).toBeUndefined();
});

test('the hook refuses an in-place edit with exit code 2 and says what to use', () => {
  const refused = hook("sed -i 's/a/b/' notes.md");
  expect(refused.status).toBe(2);
  expect(refused.stderr).toContain('Use the Edit tool');
  expect(hook('git status').status).toBe(0);
});
