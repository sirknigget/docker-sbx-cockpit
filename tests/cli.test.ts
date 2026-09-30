import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';
test('CLI documents the default port and rejects invalid ports', () => {
  expect(
    execFileSync(process.execPath, ['bin/sbx-cockpit.mjs', '--help'], {
      encoding: 'utf8',
    }),
  ).toContain('9876');
  expect(() =>
    execFileSync(process.execPath, ['bin/sbx-cockpit.mjs', '--port', '0'], {
      stdio: 'pipe',
    }),
  ).toThrow();
});
