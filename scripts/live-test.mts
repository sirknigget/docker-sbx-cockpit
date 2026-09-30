import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { z } from 'zod';
import type { createApp as createNestApp } from '../server/bootstrap';
import { createRequire } from 'node:module';
import { SbxRunner } from '../server/runner';
import { inventorySchema, resultSchema } from '../shared/contracts';
import {
  templatesSchema,
  secretsSchema,
  portsSchema,
} from '../shared/configuration';
import {
  directorySchema,
  diskSchema,
  fileSchema,
  terminalSchema,
} from '../shared/inspection';

const load = createRequire(resolve('package.json'));
// SAFETY: npm run test:live builds this exact Nest source before loading it.
const { createApp } = load('./dist/server/bootstrap.js') as {
  createApp: typeof createNestApp;
};
const token = randomUUID().slice(0, 8);
const name = `cockpit-test-${token}`;
const clone = `${name}-clone`;
const reference = `${name}:test`;
const workspace = resolve('.live-test', token);
const runner = new SbxRunner();
const app = await createApp(runner);

await app.listen(0, '127.0.0.1');

const base = await app.getUrl();
const attempted: string[] = [];
let saved = false;
let terminalId = '';

async function call<T>(
  path: string,
  schema: z.ZodType<T>,
  method = 'GET',
  body?: string,
) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Cockpit-Request': '1',
  };
  const response =
    method === 'GET'
      ? await fetch(`${base}/api${path}`, { headers })
      : await mutate(path, method, body);
  const data = await response.json();

  if (!response.ok)
    throw new Error(z.object({ message: z.string() }).parse(data).message);

  return schema.parse(data);
}

async function mutate(path: string, method: string, body?: string) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Cockpit-Request': '1' },
    body,
  });
}

const initial = await call('/sandboxes', inventorySchema);
const initialTemplates = await call('/templates', templatesSchema);
const initialSecrets = await call('/secrets', secretsSchema);
const beforeNames = new Set(initial.sandboxes.map((sandbox) => sandbox.name));

assert(!beforeNames.has(name) && !beforeNames.has(clone));
assert(
  !initialTemplates.images.some((image) =>
    image.repository.endsWith(`/${name}`),
  ),
);
await mkdir(workspace, { recursive: true });
await writeFile(
  resolve(workspace, 'ownership.json'),
  JSON.stringify(
    { name, clone, reference, initial, initialTemplates, initialSecrets },
    null,
    2,
  ),
);

async function create(sandbox: string, template?: string) {
  attempted.push(sandbox);
  await call(
    '/sandboxes',
    resultSchema,
    'POST',
    JSON.stringify({
      name: sandbox,
      agent: 'shell',
      workspaces: [workspace],
      template,
    }),
  );
  assert(
    (await call('/sandboxes', inventorySchema)).sandboxes.some(
      (item) => item.name === sandbox,
    ),
  );
}

async function waitForOutput(marker: string) {
  let output = '';

  for (let attempt = 0; attempt < 150; attempt++) {
    const state = await call(
      `/sandboxes/${name}/terminal/${terminalId}`,
      terminalSchema,
    );

    output = state.output;

    if (output.includes(marker)) return output;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `Terminal output did not contain ${marker}: ${output.slice(-1000)}`,
  );
}

async function command(input: string, marker: string) {
  await call(
    `/sandboxes/${name}/terminal/${terminalId}/input`,
    terminalSchema,
    'POST',
    JSON.stringify({ input: input + '\n' }),
  );

  return waitForOutput(marker);
}

async function inspect() {
  terminalId = (
    await call(`/sandboxes/${name}/terminal`, terminalSchema, 'POST')
  ).id;
  await command(
    "mkdir -p /tmp/cockpit-live/cache; printf 'hello cockpit\\n' > '/tmp/cockpit-live/hello Δ name.txt'; head -c 1048577 /dev/zero > /tmp/cockpit-live/large.bin; printf '\\0' > /tmp/cockpit-live/binary.bin; echo LIVE_READY",
    'LIVE_READY',
  );
  await inspectFiles();

  const disk = await call(
    `/sandboxes/${name}/disk?path=/tmp/cockpit-live`,
    diskSchema,
  );

  assert(
    disk.entries.some(
      (entry) => entry.path === '/tmp/cockpit-live' && entry.size >= 1048577,
    ),
  );
  assert(
    (
      await command('cd /tmp/cockpit-live; pwd; echo CWD_ONE', 'CWD_ONE')
    ).includes('/tmp/cockpit-live'),
  );
  assert(
    (await command('pwd; echo CWD_TWO', 'CWD_TWO')).includes(
      '/tmp/cockpit-live',
    ),
  );
  await call(
    `/sandboxes/${name}/terminal/${terminalId}`,
    resultSchema,
    'DELETE',
  );
  terminalId = '';
}

async function inspectFiles() {
  const directory = await call(
    `/sandboxes/${name}/files?path=/tmp/cockpit-live`,
    directorySchema,
  );

  assert(directory.entries.some((entry) => entry.name === 'hello Δ name.txt'));

  const file = await call(
    `/sandboxes/${name}/file?path=${encodeURIComponent('/tmp/cockpit-live/hello Δ name.txt')}`,
    fileSchema,
  );

  assert.equal(file.content, 'hello cockpit\n');
  await assert.rejects(
    call(
      `/sandboxes/${name}/file?path=/tmp/cockpit-live/large.bin`,
      fileSchema,
    ),
    /1 MiB/,
  );
  await assert.rejects(
    call(
      `/sandboxes/${name}/file?path=/tmp/cockpit-live/binary.bin`,
      fileSchema,
    ),
    /Binary/,
  );
}

async function configure() {
  await configureCustomSecret();
  await call(
    '/secrets',
    resultSchema,
    'POST',
    JSON.stringify({
      kind: 'service',
      scope: name,
      name: 'groq',
      value: 'cockpit-live-test-not-a-real-key',
    }),
  );

  const secrets = await call(`/secrets?scope=${name}`, secretsSchema);

  assert(secrets.secrets.some((secret) => secret.name === 'groq'));
  await call(
    '/secrets',
    resultSchema,
    'DELETE',
    JSON.stringify({ kind: 'service', scope: name, name: 'groq' }),
  );
  await call(
    `/sandboxes/${name}/ports`,
    resultSchema,
    'POST',
    JSON.stringify({ sandboxPort: 45678, protocol: 'tcp4' }),
  );

  const port = (await call(`/sandboxes/${name}/ports`, portsSchema)).ports.find(
    (port) => port.sandbox_port === 45678,
  );

  assert(port);
  await call(
    `/sandboxes/${name}/ports`,
    resultSchema,
    'DELETE',
    JSON.stringify({
      sandboxPort: port.sandbox_port,
      hostPort: port.host_port,
      hostIp: port.host_ip,
      protocol: port.protocol,
    }),
  );
  await configureTemplates();
}

async function configureCustomSecret() {
  await call(
    '/secrets',
    resultSchema,
    'POST',
    JSON.stringify({
      kind: 'custom',
      scope: name,
      hosts: ['api.cockpit-test.invalid'],
      env: 'COCKPIT_DUMMY_KEY',
      value: 'cockpit-live-test-not-a-real-key',
    }),
  );

  const inventory = await call(`/secrets?scope=${name}`, secretsSchema);
  const secret = inventory.custom_secrets.find(
    (secret) => secret.env === 'COCKPIT_DUMMY_KEY',
  );

  assert(secret);
  await call(
    '/secrets',
    resultSchema,
    'DELETE',
    JSON.stringify({
      kind: 'custom',
      scope: name,
      placeholder: secret.placeholder,
    }),
  );
}

async function configureTemplates() {
  await call(`/sandboxes/${name}/stop`, resultSchema, 'POST');
  saved = true;
  await call(
    '/templates',
    resultSchema,
    'POST',
    JSON.stringify({ sandbox: name, reference }),
  );
  assert(
    (await call('/templates', templatesSchema)).images.some((image) =>
      image.repository.endsWith(`/${name}`),
    ),
  );
  await create(clone, reference);
  await call(`/sandboxes/${clone}/stop`, resultSchema, 'POST');
}

async function cleanup() {
  if (terminalId)
    await call(
      `/sandboxes/${name}/terminal/${terminalId}`,
      resultSchema,
      'DELETE',
    );

  const inventory = await call('/sandboxes', inventorySchema);

  for (const owned of attempted) {
    assert(!beforeNames.has(owned));

    if (inventory.sandboxes.some((sandbox) => sandbox.name === owned))
      await call(`/sandboxes/${owned}`, resultSchema, 'DELETE');
  }

  if (saved) {
    const templates = await call('/templates', templatesSchema);

    if (templates.images.some((image) => image.repository.endsWith(`/${name}`)))
      await call(
        '/templates',
        resultSchema,
        'DELETE',
        JSON.stringify({ reference }),
      );
  }
}

async function verifyUnchanged() {
  const final = await call('/sandboxes', inventorySchema);

  for (const original of initial.sandboxes)
    assert.deepEqual(
      final.sandboxes.find((item) => item.name === original.name),
      original,
    );
  assert.deepEqual(await call('/templates', templatesSchema), initialTemplates);
  assert.deepEqual(await call('/secrets', secretsSchema), initialSecrets);
  console.log('Existing resources unchanged; owned resources cleaned.');
}

try {
  // An optional cached base image is READ ONLY; the test never snapshots an existing sandbox.
  await create(name, process.env.COCKPIT_TEST_BASE_TEMPLATE);
  await inspect();
  await configure();
  await call(`/sandboxes/${name}/stop`, resultSchema, 'POST');
} finally {
  try {
    await cleanup();
    await verifyUnchanged();
  } finally {
    await app.close();
  }
}

console.log(
  'PASS: live lifecycle, templates, secrets, ports, files, disk and persistent Bash.',
);
