import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { SbxRunner } from '../server/runner';

const executable = `#!${process.execPath}
const args = process.argv.slice(2);
const command = args[0];
if (command === 'arguments') {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => process.stdout.write(JSON.stringify({ args, input })));
} else if (command === 'streams') {
  process.stderr.write('stderr-must-not-enter-json');
  process.stdout.write('{"ready":true}');
} else if (command === 'failure') {
  process.stdin.resume();
  process.stdin.on('end', () => {
    process.stderr.write('fixture-error-secret-token');
    process.exitCode = 7;
  });
} else if (command === 'large') {
  process.stdout.write(Buffer.alloc(1100 * 1024, 65));
  process.stderr.write(Buffer.alloc(1100 * 1024, 66));
} else if (command === 'wait') {
  setTimeout(() => process.stdout.write('late-output'), 10000);
}
`;
let directory = '';
let previousPath: string | undefined;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'sbx-runner-fixture-'));

  const path = join(directory, 'sbx');

  await writeFile(path, executable);
  await chmod(path, 0o700);
  previousPath = process.env.PATH;
  process.env.PATH = directory;
});
afterEach(async () => {
  if (previousPath === undefined) delete process.env.PATH;
  else process.env.PATH = previousPath;
  await rm(directory, { recursive: true, force: true });
});
test('arguments are passed literally without host-shell interpretation', async () => {
  const args = [
    'arguments',
    '$(touch /tmp/should-not-exist)',
    '; echo injected',
    'space value',
    '--sandbox',
    'fixture-box',
  ];
  const output = await new SbxRunner().run(args, 'fixture-value\n');

  expect(JSON.parse(output)).toEqual({ args, input: 'fixture-value\n' });
});
test('successful commands return stdout without stderr contamination', async () => {
  expect(await new SbxRunner().run(['streams'])).toBe('{"ready":true}');
});
test('nonsecret failures retain CLI diagnostics', async () => {
  await expect(new SbxRunner().run(['failure'])).rejects.toThrow(
    'fixture-error-secret-token',
  );
});
test.each(['fixture-value', ''])(
  'defined stdin redacts CLI failure diagnostics',
  async (input) => {
    await expect(new SbxRunner().run(['failure'], input)).rejects.toThrow(
      'sbx secret operation failed',
    );
  },
);
test('combined stdout and stderr enforce bounded output', async () => {
  await expect(new SbxRunner().run(['large'])).rejects.toThrow('2 MiB limit');
});
test('timed-out processes reject with an inventory reminder', async () => {
  await expect(new SbxRunner().run(['wait'], undefined, 50)).rejects.toThrow(
    'sbx timed out; check the resource inventory before retrying.',
  );
});
test('missing sbx reports executable startup failure', async () => {
  await rm(join(directory, 'sbx'));
  await expect(new SbxRunner().run(['streams'])).rejects.toThrow(
    'Unable to run sbx',
  );
});
