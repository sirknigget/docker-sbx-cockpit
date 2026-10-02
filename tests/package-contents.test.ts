import { expect, test } from 'vitest';
import { verifyPackage } from '../scripts/package-contents';

const minimumEntries = [
  'package.json',
  'README.md',
  'bin/sbx-cockpit.mjs',
  'dist/server/main.js',
  'dist/shared/contracts.js',
  'dist/shared/configuration.js',
  'dist/shared/inspection.js',
  'dist/web/index.html',
  'dist/web/assets/index-fixture.js',
  'dist/web/assets/index-fixture.css',
];

test('accepts a standalone runtime package with bundled frontend assets', () => {
  expect(() => verifyPackage([...minimumEntries, 'LICENSE'])).not.toThrow();
});

test.each([
  'AGENTS.md',
  'docs/reference.md',
  'tests/lifecycle.test.ts',
  'server/main.ts',
  'dist/web/AGENTS.md',
  'dist/tests/fixture.js',
  'dist/server/main.ts',
  'dist/../package.json',
])('rejects forbidden package contents: %s', (entry) => {
  expect(() => verifyPackage([...minimumEntries, entry])).toThrow();
});

test.each([
  'package.json',
  'bin/sbx-cockpit.mjs',
  'dist/server/main.js',
  'dist/shared/contracts.js',
  'dist/shared/configuration.js',
  'dist/shared/inspection.js',
  'dist/web/index.html',
  'dist/web/assets/index-fixture.js',
  'dist/web/assets/index-fixture.css',
])('rejects a package missing required runtime content: %s', (missing) => {
  expect(() =>
    verifyPackage(minimumEntries.filter((entry) => entry !== missing)),
  ).toThrow();
});
