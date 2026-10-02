import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { z } from 'zod';
import { parse } from 'yaml';
import { releaseVersion, setPackageVersion } from '../scripts/release.mjs';

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function git(directory: string, ...args: string[]) {
  return execFileSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    stdio: 'pipe',
  }).trim();
}

function repository() {
  const directory = mkdtempSync(join(tmpdir(), 'cockpit-release-test-'));
  const pkg = { name: 'release-test', version: '0.1.0' };

  directories.push(directory);
  git(directory, 'init', '-b', 'main');
  git(directory, 'config', 'user.email', 'fixture@example.test');
  git(directory, 'config', 'user.name', 'Release fixture');
  writeFileSync(join(directory, 'package.json'), JSON.stringify(pkg));
  writeFileSync(
    join(directory, 'package-lock.json'),
    JSON.stringify({ ...pkg, lockfileVersion: 3, packages: { '': pkg } }),
  );
  git(directory, 'add', '.');
  git(directory, 'commit', '-m', 'Existing main commit');
  git(directory, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

  return directory;
}

test.each(['0.1.0', '1.2.3', '12.34.56'])(
  'accepts exact version tag %s on a main commit',
  (version) => {
    const directory = repository();

    git(directory, 'tag', version);
    expect(releaseVersion('push', `refs/tags/${version}`, directory)).toBe(
      version,
    );
  },
);

test.each(['v1.2.3', '1.2', '1.2.3-beta', '1.2.3+build', '01.2.3', 'release'])(
  'rejects non-release tag %s',
  (version) => {
    expect(() => releaseVersion('push', `refs/tags/${version}`)).toThrow(
      'exactly x.x.x',
    );
  },
);

test.each([
  ['push', 'refs/heads/main'],
  ['pull_request', 'refs/tags/1.2.3'],
  ['workflow_dispatch', 'refs/tags/1.2.3'],
])('rejects %s at %s without building or publishing', (event, ref) => {
  expect(() => releaseVersion(event, ref)).toThrow('requires a tag push');
});

test('rejects a tag on a branch commit outside main', () => {
  const directory = repository();

  git(directory, 'checkout', '-b', 'feature');
  git(directory, 'commit', '--allow-empty', '-m', 'Feature only');
  git(directory, 'tag', '1.2.3');
  expect(() => releaseVersion('push', 'refs/tags/1.2.3', directory)).toThrow(
    'origin/main',
  );
});

test('builds an annotated tag on an older main commit with the tag version', () => {
  const directory = repository();

  git(directory, 'tag', '-a', '2.3.4', '-m', 'Release');
  git(directory, 'commit', '--allow-empty', '-m', 'Later main commit');
  git(directory, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(directory, 'checkout', '2.3.4');

  const version = releaseVersion('push', 'refs/tags/2.3.4', directory);

  setPackageVersion(version, directory);

  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const lock = JSON.parse(
    readFileSync(join(directory, 'package-lock.json'), 'utf8'),
  );

  expect(pkg.version).toBe('2.3.4');
  expect(lock.version).toBe('2.3.4');
  expect(lock.packages[''].version).toBe('2.3.4');
  expect(git(directory, 'tag', '--list')).toBe('2.3.4');
  expect(git(directory, 'log', '-1', '--format=%s')).toBe(
    'Existing main commit',
  );
});

test('rejects checking out a different commit than the tag', () => {
  const directory = repository();

  git(directory, 'tag', '1.2.3');
  git(directory, 'commit', '--allow-empty', '-m', 'Different checkout');
  expect(() => releaseVersion('push', 'refs/tags/1.2.3', directory)).toThrow(
    'Checkout must match',
  );
});

test('CI entry point runs on Node and writes the exact tag version and output', () => {
  const directory = repository();
  const output = join(directory, 'github-output');

  git(directory, 'tag', '3.4.5');
  execFileSync(process.execPath, [resolve('scripts/release.mts')], {
    cwd: directory,
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: 'push',
      GITHUB_REF: 'refs/tags/3.4.5',
      GITHUB_OUTPUT: output,
    },
    stdio: 'pipe',
  });

  const pkg = z
    .object({ version: z.string() })
    .parse(JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')));

  expect(pkg.version).toBe('3.4.5');
  expect(readFileSync(output, 'utf8')).toBe('version=3.4.5\n');
});

const workflowSchema = z.object({
  on: z
    .object({ push: z.object({ tags: z.array(z.string()) }).strict() })
    .strict(),
  jobs: z.object({
    package: z.object({
      steps: z.array(z.object({ run: z.string().optional() }).passthrough()),
    }),
    publish: z.object({
      needs: z.string(),
      steps: z.array(z.object({ run: z.string().optional() }).passthrough()),
    }),
  }),
});

test('workflow only triggers for tags and publishes the verified tarball after checks', () => {
  const workflow = workflowSchema.parse(
    parse(readFileSync('.github/workflows/publish.yml', 'utf8')),
  );
  const packaging = workflow.jobs.package.steps.flatMap(
    (step) => step.run ?? [],
  );
  const publishing = workflow.jobs.publish.steps.flatMap(
    (step) => step.run ?? [],
  );

  expect(workflow.on.push.tags).toEqual(['*.*.*']);
  expect(packaging[0]).toBe('node scripts/release.mts');
  expect(packaging).toContain('npm run check');

  const pkg = z
    .object({ scripts: z.object({ check: z.string() }) })
    .parse(JSON.parse(readFileSync('package.json', 'utf8')));

  expect(pkg.scripts.check).toContain('npm run test:package');
  expect(workflow.jobs.publish.needs).toBe('package');
  expect(publishing).toContain(
    'npm publish npm-package/*.tgz --access public --provenance',
  );
  expect(packaging.join('\n')).not.toContain('npm publish');
});
