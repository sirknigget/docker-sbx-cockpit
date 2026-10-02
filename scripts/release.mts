import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function releaseVersion(
  event: string,
  ref: string,
  directory = process.cwd(),
) {
  if (event !== 'push' || !ref.startsWith('refs/tags/'))
    throw new Error('Publishing requires a tag push.');

  const version = ref.slice('refs/tags/'.length);

  if (!versionPattern.test(version))
    throw new Error('Release tags must be exactly x.x.x, without a v prefix.');

  const commit = git(['rev-parse', '--verify', `${ref}^{commit}`], directory);
  const head = git(['rev-parse', 'HEAD'], directory);

  if (commit !== head)
    throw new Error('Checkout must match the tagged commit.');

  try {
    git(['merge-base', '--is-ancestor', commit, 'origin/main'], directory);
  } catch {
    throw new Error('Release tag must point to a commit on origin/main.');
  }

  return version;
}

export function setPackageVersion(version: string, directory = process.cwd()) {
  execFileSync(
    'npm',
    [
      'version',
      version,
      '--no-git-tag-version',
      '--allow-same-version',
      '--ignore-scripts',
    ],
    { cwd: directory, stdio: 'pipe', timeout: 30_000 },
  );
}

function git(args: string[], directory: string) {
  return execFileSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30_000,
  }).trim();
}

function main() {
  const version = releaseVersion(
    process.env.GITHUB_EVENT_NAME ?? '',
    process.env.GITHUB_REF ?? '',
  );

  setPackageVersion(version);

  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  console.log(`Building npm release ${version} from the checked-out tag.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
