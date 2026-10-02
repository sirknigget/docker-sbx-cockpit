import assert from 'node:assert/strict';

export function verifyPackage(entries: string[]) {
  const rootFiles = new Set([
    'package.json',
    'README.md',
    'LICENSE',
    'LICENSE.md',
  ]);

  for (const entry of entries) {
    assert(!entry.split('/').includes('..'), `Unsafe archive path: ${entry}`);
    assert(
      rootFiles.has(entry) ||
        entry === 'bin/sbx-cockpit.mjs' ||
        entry.startsWith('dist/'),
      `Unexpected packed file: ${entry}`,
    );
    assert(
      !entry
        .split('/')
        .some((part) => ['docs', 'tests', 'AGENTS.md'].includes(part)),
      `Contributor file included: ${entry}`,
    );
    assert(
      !/\.(?:ts|tsx|mts|cts)$/.test(entry),
      `Source file included: ${entry}`,
    );
  }

  for (const required of [
    'package.json',
    'bin/sbx-cockpit.mjs',
    'dist/server/main.js',
    'dist/shared/contracts.js',
    'dist/shared/configuration.js',
    'dist/shared/inspection.js',
    'dist/web/index.html',
  ]) {
    assert(
      entries.includes(required),
      `Missing packed runtime file: ${required}`,
    );
  }

  assert(
    entries.some((entry) => /^dist\/web\/assets\/.+\.js$/.test(entry)),
    'Missing bundled frontend JavaScript',
  );
  assert(
    entries.some((entry) => /^dist\/web\/assets\/.+\.css$/.test(entry)),
    'Missing bundled frontend CSS',
  );
}
