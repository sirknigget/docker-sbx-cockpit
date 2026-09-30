import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterEach, beforeEach, expect, test } from 'vitest';
import {
  Configuration,
  ConfigurationController,
} from '../server/configuration';
import { Runner } from '../server/runner';
import { templateReference, secretsSchema } from '../shared/configuration';
import { HttpFilter, ValidationFilter } from '../server/security';

class ConfigurationRunner extends Runner {
  readonly calls: { args: string[]; stdin?: string }[] = [];

  async run(args: string[], stdin?: string) {
    this.calls.push({ args, stdin });

    if (args.join(' ') === 'template ls --json')
      return JSON.stringify({
        images: [
          {
            id: 'fixture-image',
            repository: 'local/tools',
            tag: 'v1',
            flavor: 'shell',
            size: 1048576,
          },
        ],
      });

    if (args[0] === 'secret' && args[1] === 'ls')
      return JSON.stringify({
        secrets: [
          {
            scope: 'global',
            type: 'service',
            name: 'openai',
            secret: 'never-send-this-token',
          },
        ],
        custom_secrets: [
          {
            scope: 'global',
            targets: ['api.fixture.test'],
            env: 'API_KEY',
            placeholder: 'sbx-cs-fixture',
            secret: 'never-send-custom-token',
          },
        ],
      });

    if (args[0] === 'ports' && args.includes('--json'))
      return JSON.stringify([
        {
          host_ip: '127.0.0.1',
          host_port: 8080,
          sandbox_port: 3000,
          protocol: 'tcp4',
        },
      ]);

    return 'stored-private-value';
  }
}

@Module({})
class ConfigurationTestModule {}

let app: INestApplication;
let runner: ConfigurationRunner;

beforeEach(async () => {
  runner = new ConfigurationRunner();
  app = await NestFactory.create(
    {
      module: ConfigurationTestModule,
      controllers: [ConfigurationController],
      providers: [Configuration, { provide: Runner, useValue: runner }],
    },
    { logger: false },
  );
  app.useGlobalFilters(new HttpFilter(), new ValidationFilter());
  await app.init();
});
afterEach(async () => {
  await app.close();
});
test('templates list, snapshot and delete invoke sbx with exact arguments', async () => {
  await request(app.getHttpServer())
    .get('/api/templates')
    .expect(200)
    .expect((response) => {
      expect(response.body.images[0].tag).toBe('v1');
    });
  await request(app.getHttpServer())
    .post('/api/templates')
    .send({ sandbox: 'fixture-box', reference: 'local/tools:v2' })
    .expect(201);
  await request(app.getHttpServer())
    .delete('/api/templates')
    .send({ reference: 'local/tools:v2' })
    .expect(200);
  expect(runner.calls.map((call) => call.args)).toEqual([
    ['template', 'ls', '--json'],
    ['template', 'save', 'fixture-box', 'local/tools:v2'],
    ['template', 'rm', '--force', 'local/tools:v2'],
  ]);
});
test('secret inventory omits values and dynamic source metadata', async () => {
  const result = await request(app.getHttpServer())
    .get('/api/secrets')
    .expect(200);

  expect(result.body).toEqual({
    secrets: [{ scope: 'global', type: 'service', name: 'openai' }],
    custom_secrets: [
      {
        scope: 'global',
        targets: ['api.fixture.test'],
        env: 'API_KEY',
        placeholder: 'sbx-cs-fixture',
      },
    ],
  });
  expect(JSON.stringify(result.body)).not.toContain('token');
});
test('service and registry values go through stdin and never into response or argv', async () => {
  const result = await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'service',
      scope: 'fixture-box',
      name: 'openai',
      value: 'fixture-only-secret',
    })
    .expect(201);

  expect(result.body).toEqual({ output: 'Secret saved' });
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'registry',
      scope: 'global',
      name: 'ghcr.io',
      username: 'fixture-user',
      value: 'fixture-password',
    })
    .expect(201);
  expect(runner.calls).toEqual([
    {
      args: ['secret', 'set', 'openai', '--sandbox', 'fixture-box'],
      stdin: 'fixture-only-secret',
    },
    {
      args: [
        'secret',
        'set',
        '--registry',
        'ghcr.io',
        '--password-stdin',
        '--username',
        'fixture-user',
        '--all-sandboxes',
      ],
      stdin: 'fixture-password',
    },
  ]);
});
test('custom references delegate routing and placeholder deletion to sbx', async () => {
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'custom',
      scope: 'global',
      hosts: ['api.fixture.test', '*.fixture.test'],
      env: 'API_KEY',
      reference: 'op://Fixture/API/key',
    })
    .expect(201);
  await request(app.getHttpServer())
    .delete('/api/secrets')
    .send({
      kind: 'custom',
      scope: 'fixture-box',
      placeholder: 'sbx-cs-fixture',
    })
    .expect(200);
  expect(runner.calls).toEqual([
    {
      args: [
        'secret',
        'set-custom',
        '--host',
        'api.fixture.test',
        '--host',
        '*.fixture.test',
        '--env',
        'API_KEY',
        '--ref',
        'op://Fixture/API/key',
      ],
      stdin: '',
    },
    {
      args: [
        'secret',
        'rm',
        '--force',
        '--placeholder',
        'sbx-cs-fixture',
        '--sandbox',
        'fixture-box',
      ],
      stdin: '',
    },
  ]);
});
test('ports normalize CLI arrays and delegate publish and unpublish', async () => {
  const result = await request(app.getHttpServer())
    .get('/api/sandboxes/fixture-box/ports')
    .expect(200);

  expect(result.body.ports[0].host_port).toBe(8080);

  const binding = {
    hostIp: '127.0.0.1',
    hostPort: 8080,
    sandboxPort: 3000,
    protocol: 'tcp4',
  };

  await request(app.getHttpServer())
    .post('/api/sandboxes/fixture-box/ports')
    .send(binding)
    .expect(201);
  await request(app.getHttpServer())
    .delete('/api/sandboxes/fixture-box/ports')
    .send(binding)
    .expect(200);
  expect(runner.calls.map((call) => call.args)).toEqual([
    ['ports', 'fixture-box', '--json'],
    ['ports', 'fixture-box', '--publish', '127.0.0.1:8080:3000/tcp4'],
    ['ports', 'fixture-box', '--unpublish', '127.0.0.1:8080:3000/tcp4'],
  ]);
});
test('validation rejects option injection and invalid scope before invoking CLI', async () => {
  await request(app.getHttpServer())
    .delete('/api/templates')
    .send({ reference: '--all' })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'service',
      scope: 'host',
      name: 'openai',
      value: 'fixture-only',
    })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/sandboxes/fixture-box/ports')
    .send({ sandboxPort: 0 })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'custom',
      scope: 'global',
      hosts: ['--all'],
      env: 'API_KEY',
      reference: 'op://Fixture/API/key',
    })
    .expect(400);
  expect(runner.calls).toEqual([]);
});
test('ephemeral and IPv6 bindings preserve sbx port syntax', async () => {
  await request(app.getHttpServer())
    .post('/api/sandboxes/fixture-box/ports')
    .send({ sandboxPort: 3000 })
    .expect(201);
  await request(app.getHttpServer())
    .post('/api/sandboxes/fixture-box/ports')
    .send({
      hostIp: '::1',
      hostPort: 8080,
      sandboxPort: 3000,
      protocol: 'tcp6',
    })
    .expect(201);
  await request(app.getHttpServer())
    .post('/api/sandboxes/fixture-box/ports')
    .send({ hostIp: '127.0.0.1', sandboxPort: 3000 })
    .expect(400);
  expect(runner.calls.map((call) => call.args)).toEqual([
    ['ports', 'fixture-box', '--publish', '3000/tcp4'],
    ['ports', 'fixture-box', '--publish', '[::1]:8080:3000/tcp6'],
  ]);
});
test('secret deletion never broadens a sandbox or global registry scope', async () => {
  await request(app.getHttpServer())
    .delete('/api/secrets')
    .send({ kind: 'service', scope: 'fixture-box', name: 'openai' })
    .expect(200);
  await request(app.getHttpServer())
    .delete('/api/secrets')
    .send({ kind: 'registry', scope: 'global', name: 'ghcr.io' })
    .expect(200);
  expect(runner.calls.map((call) => call.args)).toEqual([
    ['secret', 'rm', '--force', 'openai', '--sandbox', 'fixture-box'],
    ['secret', 'rm', '--force', '--registry', 'ghcr.io', '--all-sandboxes'],
  ]);
});
test.each(['tcp', 'tcp4', 'tcp6', 'udp', 'udp4', 'udp6'])(
  'supports documented %s port protocol',
  async (protocol) => {
    await request(app.getHttpServer())
      .post('/api/sandboxes/fixture-box/ports')
      .send({ sandboxPort: 65535, protocol })
      .expect(201);
    expect(runner.calls[0]?.args).toEqual([
      'ports',
      'fixture-box',
      '--publish',
      `65535/${protocol}`,
    ]);
  },
);
test.each([0, -1, 65536, 1.5])(
  'rejects out-of-range or noninteger port %s',
  async (port) => {
    await request(app.getHttpServer())
      .post('/api/sandboxes/fixture-box/ports')
      .send({ sandboxPort: port })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/sandboxes/fixture-box/ports')
      .send({ sandboxPort: 3000, hostPort: port })
      .expect(400);
    expect(runner.calls).toEqual([]);
  },
);
test('optional registry username and host-only default scope stay absent in argv', async () => {
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'registry',
      scope: 'host',
      name: 'registry.fixture.test:5000',
      value: 'fixture-only-password',
    })
    .expect(201);
  expect(runner.calls).toEqual([
    {
      args: [
        'secret',
        'set',
        '--registry',
        'registry.fixture.test:5000',
        '--password-stdin',
      ],
      stdin: 'fixture-only-password',
    },
  ]);
});
test('invalid dynamic references and missing unpublish binding never invoke CLI', async () => {
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'custom',
      scope: 'global',
      hosts: ['api.fixture.test'],
      env: 'API_KEY',
      reference: 'cat /host-secret',
    })
    .expect(400);
  await request(app.getHttpServer())
    .delete('/api/sandboxes/fixture-box/ports')
    .send({ sandboxPort: 3000 })
    .expect(400);
  expect(runner.calls).toEqual([]);
});

test('untagged templates can be addressed by CLI image ID', () => {
  expect(
    templateReference({
      id: 'fixture-id',
      repository: '<none>',
      tag: '<none>',
      size: 0,
    }),
  ).toBe('fixture-id');
});
test('host-only inventory aliases stay available for scope filtering without values', () => {
  expect(
    secretsSchema.parse({
      secrets: [
        {
          scope: 'host-only',
          type: 'registry',
          name: 'ghcr.io',
          secret: 'fixture-token',
        },
      ],
    }),
  ).toEqual({
    secrets: [{ scope: 'host', type: 'registry', name: 'ghcr.io' }],
    custom_secrets: [],
  });
});
test('direct custom secret values go through stdin and never argv or responses', async () => {
  const result = await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      kind: 'custom',
      scope: 'fixture-box',
      hosts: ['api.fixture.test'],
      env: 'API_KEY',
      value: 'fixture-custom-secret',
    })
    .expect(201);

  expect(result.body).toEqual({ output: 'Secret saved' });
  expect(runner.calls).toEqual([
    {
      args: [
        'secret',
        'set-custom',
        '--host',
        'api.fixture.test',
        '--env',
        'API_KEY',
        '--sandbox',
        'fixture-box',
      ],
      stdin: 'fixture-custom-secret',
    },
  ]);
  expect(JSON.stringify(runner.calls[0]?.args)).not.toContain(
    'fixture-custom-secret',
  );
});
test('custom secret creation requires exactly one value or reference', async () => {
  const input = {
    kind: 'custom',
    scope: 'global',
    hosts: ['api.fixture.test'],
    env: 'API_KEY',
  };

  await request(app.getHttpServer())
    .post('/api/secrets')
    .send(input)
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/secrets')
    .send({
      ...input,
      value: 'fixture-only',
      reference: 'op://Fixture/API/key',
    })
    .expect(400);
  expect(runner.calls).toEqual([]);
});
