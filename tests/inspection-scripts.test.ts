import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { directoryScript, fileScript } from '../server/inspection-scripts';

function executable(directory: string, name: string, script: string) {
  writeFileSync(join(directory, name), `#!/bin/sh\n${script}\n`, {
    mode: 0o755,
  });
}

function execute(script: string, directory: string, path: string) {
  return execFileSync('bash', ['-c', script, '--', path], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${directory}:/usr/bin:/bin` },
    stdio: 'pipe',
  });
}

test('directory inspection propagates permission failure through the output-limiting pipeline', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cockpit-script-test-'));

  try {
    executable(directory, 'find', "printf 'Permission denied' >&2; exit 1");
    executable(directory, 'head', 'cat');
    expect(() => execute(directoryScript, directory, directory)).toThrow();
    executable(directory, 'find', "printf 'f\\0notes\\010\\0'; exit 0");
    expect(execute(directoryScript, directory, directory)).toContain('notes');
    executable(directory, 'find', "printf 'f\\0notes\\010\\0'; exit 141");
    expect(execute(directoryScript, directory, directory)).toContain('notes');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('file inspection propagates read failures and rejects symlinks/nonregular paths', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cockpit-file-test-'));
  const file = join(directory, 'owned-file');

  try {
    writeFileSync(file, 'owned contents');
    executable(directory, 'stat', 'printf 14');
    executable(directory, 'head', "printf 'Permission denied' >&2; exit 1");
    executable(directory, 'base64', 'cat');
    expect(() => execute(fileScript, directory, file)).toThrow();
    expect(() => execute(fileScript, directory, directory)).toThrow();

    const link = join(directory, 'owned-link');

    symlinkSync(file, link);
    expect(() => execute(fileScript, directory, link)).toThrow();

    const fifo = join(directory, 'owned-fifo');

    execFileSync('mkfifo', [fifo]);
    expect(() => execute(fileScript, directory, fifo)).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
