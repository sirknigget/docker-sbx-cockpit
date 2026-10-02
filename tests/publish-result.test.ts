import { expect, test } from 'vitest';
import { publishedFiles } from '../scripts/publish-result';

const result = {
  id: 'docker-sbx-cockpit@0.1.2',
  name: 'docker-sbx-cockpit',
  version: '0.1.2',
  files: [{ path: 'LICENSE' }, { path: 'package.json' }],
};

test('reads npm 11.10 publish dry-run output', () => {
  expect(publishedFiles(JSON.stringify(result))).toEqual([
    'LICENSE',
    'package.json',
  ]);
});

test('reads npm 11.19 output keyed by package name', () => {
  expect(
    publishedFiles(JSON.stringify({ 'docker-sbx-cockpit': result })),
  ).toEqual(['LICENSE', 'package.json']);
});

test.each([
  { ...result, name: 'another-package' },
  { ...result, files: [] },
  { ...result, files: undefined },
  { ...result, files: [{ path: 42 }] },
  { 'docker-sbx-cockpit': result, 'another-package': result },
])('rejects invalid or ambiguous publish output: %j', (output) => {
  expect(() => publishedFiles(JSON.stringify(output))).toThrow();
});
