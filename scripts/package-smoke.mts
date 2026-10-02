import assert from 'node:assert/strict';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { constants } from 'node:fs';
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { z } from 'zod';
import { verifyPackage } from './package-contents';

const execute = promisify(execFile);
const registry = 'https://registry.npmjs.org';

async function command(
  executable: string,
  args: string[],
  cwd: string,
  cache: string,
) {
  const result = await execute(executable, args, {
    cwd,
    env: {
      ...process.env,
      npm_config_cache: cache,
      npm_config_registry: registry,
      npm_config_userconfig: join(cache, 'user.npmrc'),
      npm_config_globalconfig: join(cache, 'global.npmrc'),
    },
    timeout: 180_000,
    killSignal: 'SIGKILL',
    maxBuffer: 4 * 1024 * 1024,
    encoding: 'utf8',
  });

  return result.stdout;
}

async function pack(project: string, temporary: string, cache: string) {
  await command(
    'npm',
    ['pack', '--pack-destination', temporary],
    project,
    cache,
  );

  const files = (await readdir(temporary)).filter((file) =>
    file.endsWith('.tgz'),
  );

  assert.equal(files.length, 1, 'npm pack must produce exactly one tarball');

  const tarball = join(temporary, files[0]);
  const listing = await command('tar', ['-tzf', tarball], temporary, cache);
  const entries = listing
    .trim()
    .split('\n')
    .map((entry) => entry.replace(/^package\//, ''));

  verifyPackage(entries);

  return tarball;
}

async function freePort() {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  // SAFETY: a TCP server bound on loopback returns AddressInfo, never a pipe path.
  const address = server.address() as AddressInfo;

  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  return address.port;
}

async function verifyPublish(
  tarball: string,
  temporary: string,
  cache: string,
) {
  const directory = join(temporary, 'npm-package');

  await mkdir(directory);
  await copyFile(tarball, join(directory, basename(tarball)));

  const output = await command(
    'npm',
    [
      'publish',
      `./npm-package/${basename(tarball)}`,
      '--dry-run',
      '--offline',
      '--json',
      '--access',
      'public',
      '--ignore-scripts',
    ],
    temporary,
    cache,
  );
  const published = z
    .object({
      name: z.literal('docker-sbx-cockpit'),
      files: z.array(z.object({ path: z.string() })),
    })
    .parse(JSON.parse(output));

  verifyPackage(published.files.map((file) => file.path));
}

function startCli(executable: string, cwd: string, port: number) {
  const child = spawn(executable, ['--port', String(port)], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let diagnostics = '';
  let failure: Error | undefined;
  const collect = (chunk: Buffer) => {
    diagnostics = `${diagnostics}${chunk.toString()}`.slice(-16_384);
  };

  const closed = new Promise<void>((resolve) =>
    child.once('close', () => resolve()),
  );

  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.once('error', (error) => {
    failure = error;
  });

  return {
    child,
    closed,
    diagnostics: () => diagnostics,
    failure: () => failure,
  };
}

type Running = ReturnType<typeof startCli>;

async function waitForHealth(running: Running, origin: string) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (
      running.failure() ||
      running.child.exitCode !== null ||
      running.child.signalCode !== null
    )
      throw new Error(
        `Installed CLI exited before becoming healthy: ${running.failure()?.message ?? running.diagnostics()}`,
      );

    const response = await fetch(`${origin}/api/health`, {
      signal: AbortSignal.timeout(500),
    }).catch(() => undefined);

    if (response?.ok) {
      assert.deepEqual(await response.json(), { status: 'ok' });

      return;
    }

    await delay(100);
  }

  throw new Error(
    `Installed CLI did not become healthy: ${running.diagnostics()}`,
  );
}

async function verifyFrontend(origin: string) {
  const response = await fetch(origin, { signal: AbortSignal.timeout(5000) });

  assert(response.ok, 'Installed CLI must serve the frontend');
  assert(
    response.headers.get('content-type')?.includes('text/html'),
    'Frontend must be HTML',
  );

  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="([^"\s]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/assets/'));

  assert(html.includes('id="root"'), 'Frontend must contain the React mount');
  assert(
    assets.some((path) => path.endsWith('.js')),
    'HTML must reference bundled JavaScript',
  );
  assert(
    assets.some((path) => path.endsWith('.css')),
    'HTML must reference bundled CSS',
  );

  for (const path of assets) {
    const asset = await fetch(new URL(path, origin), {
      signal: AbortSignal.timeout(5000),
    });

    assert(asset.ok, `Bundled asset must be available: ${path}`);
    assert(
      (await asset.text()).length > 0,
      `Bundled asset must be nonempty: ${path}`,
    );
    assert(
      !asset.headers.get('content-type')?.includes('text/html'),
      `Asset must not fall back to HTML: ${path}`,
    );
  }
}

async function stop(child: ChildProcess, closed: Promise<void>) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  child.kill('SIGTERM');

  await Promise.race([closed, delay(2000)]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');

    await Promise.race([closed, delay(2000)]);
  }
}

async function retainPackage(tarball: string) {
  const output = process.env.PACKAGE_OUTPUT_DIR;

  if (!output) return;

  await mkdir(output, { recursive: true });

  const destination = join(output, basename(tarball));

  await copyFile(tarball, destination, constants.COPYFILE_EXCL);

  console.log(`Verified package retained: ${destination}`);
}

async function verifyInstalledVersion(prefix: string, project: string) {
  const schema = z.object({ name: z.string(), version: z.string() });
  const expected = schema.parse(
    JSON.parse(await readFile(join(project, 'package.json'), 'utf8')),
  );
  const installed = schema.parse(
    JSON.parse(
      await readFile(
        join(prefix, 'lib/node_modules', expected.name, 'package.json'),
        'utf8',
      ),
    ),
  );

  assert.deepEqual(
    installed,
    expected,
    'Installed package version must match the build',
  );
}

async function main() {
  const temporary = await mkdtemp(join(tmpdir(), 'sbx-cockpit-package-'));
  const prefix = join(temporary, 'prefix');
  const cache = join(temporary, 'npm-cache');
  const launchDirectory = join(temporary, 'unrelated-cwd');
  let running: Running | undefined;

  try {
    const tarball = await pack(process.cwd(), temporary, cache);

    await verifyPublish(tarball, temporary, cache);

    await mkdir(launchDirectory);
    await command(
      'npm',
      [
        'install',
        '--global',
        '--prefix',
        prefix,
        '--cache',
        cache,
        '--registry',
        registry,
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        tarball,
      ],
      launchDirectory,
      cache,
    );

    await verifyInstalledVersion(prefix, process.cwd());

    const executable = join(prefix, 'bin', 'sbx-cockpit');
    const help = await command(executable, ['--help'], launchDirectory, cache);

    assert(
      help.includes('--port') && help.includes('9876'),
      'Installed CLI must document port configuration',
    );

    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;

    running = startCli(executable, launchDirectory, port);

    await waitForHealth(running, origin);
    await verifyFrontend(origin);
    await retainPackage(tarball);

    console.log(
      'Package smoke passed: tarball, publish dry run, isolated global install, CLI help, health and frontend assets.',
    );
  } finally {
    if (running) await stop(running.child, running.closed);

    await rm(temporary, { recursive: true, force: true });
  }
}

await main();
