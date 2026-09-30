import { afterAll, beforeAll, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/bootstrap';
import { Runner } from '../server/runner';
import { Sandboxes } from '../server/sandboxes';
import { createSchema } from '../shared/contracts';
class RecordingRunner extends Runner {
  readonly calls: { args: string[]; stdin?: string }[] = [];
  async run(args: string[], stdin?: string) {
    this.calls.push({ args, stdin });
    return args[0] === 'ls'
      ? JSON.stringify({
          sandboxes: [
            {
              id: 'test-id',
              name: 'test-sandbox',
              agent: 'shell',
              status: 'running',
              workspaces: [],
              ports: [],
            },
          ],
        })
      : 'Completed';
  }
}
const runner = new RecordingRunner();
const app = await createApp(runner);
beforeAll(async () => {
  await app.init();
});
afterAll(async () => {
  await app.close();
});
const headers = { Host: '127.0.0.1', 'X-Cockpit-Request': '1' };
test('inventory reaches CLI through Nest route', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/sandboxes')
    .set(headers)
    .expect(200);
  expect(response.body.sandboxes[0].name).toBe('test-sandbox');
  expect(runner.calls.at(-1)?.args).toEqual(['ls', '--json']);
});
test('creation preserves mount args and uses saved local template', async () => {
  await request(app.getHttpServer())
    .post('/api/sandboxes')
    .set(headers)
    .send({
      name: 'new-sandbox',
      agent: 'codex',
      workspaces: ['/tmp/project with spaces', '/tmp/docs:ro'],
      template: 'example:v1',
    })
    .expect(201);
  expect(runner.calls.at(-1)?.args).toEqual([
    'create',
    '--name',
    'new-sandbox',
    '--template',
    'example:v1',
    '--pull',
    'never',
    'codex',
    '/tmp/project with spaces',
    '/tmp/docs:ro',
  ]);
});
test('stop and deletion target a single validated name', async () => {
  await request(app.getHttpServer())
    .post('/api/sandboxes/test-sandbox/stop')
    .set(headers)
    .expect(201);
  expect(runner.calls.at(-1)?.args).toEqual(['stop', 'test-sandbox']);
  await request(app.getHttpServer())
    .delete('/api/sandboxes/test-sandbox')
    .set(headers)
    .expect(200);
  expect(runner.calls.at(-1)?.args).toEqual(['rm', '--force', 'test-sandbox']);
});
test('invalid names, agents and relative mounts never reach CLI', async () => {
  const before = runner.calls.length;
  await request(app.getHttpServer())
    .post('/api/sandboxes')
    .set(headers)
    .send({ name: '--all', agent: 'shell', workspaces: [] })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/sandboxes')
    .set(headers)
    .send({ name: 'valid-name', agent: 'shell', workspaces: ['relative'] })
    .expect(400);
  expect(() =>
    createSchema.parse({
      name: 'valid-name',
      agent: 'invalid',
      workspaces: [],
    }),
  ).toThrow();
  expect(runner.calls).toHaveLength(before);
});
test('cross-origin and DNS rebinding requests are blocked', async () => {
  const before = runner.calls.length;
  await request(app.getHttpServer())
    .post('/api/sandboxes')
    .set('Host', '127.0.0.1')
    .send({})
    .expect(403);
  await request(app.getHttpServer())
    .get('/api/sandboxes')
    .set('Host', 'evil.example')
    .expect(403);
  await request(app.getHttpServer())
    .get('/api/sandboxes')
    .set('Host', '127.0.0.1')
    .set('Origin', 'https://evil.example')
    .expect(403);
  expect(runner.calls).toHaveLength(before);
});
test('CLI failures propagate without hiding useful error', async () => {
  class UnavailableRunner extends Runner {
    async run(): Promise<string> {
      throw new Error('Unavailable');
    }
  }
  await expect(new Sandboxes(new UnavailableRunner()).list()).rejects.toThrow(
    'Unavailable',
  );
});
