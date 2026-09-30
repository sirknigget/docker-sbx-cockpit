import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  Inspection,
  decodeFile,
  parseDirectory,
  parseDisk,
} from '../server/inspection';
import {
  directoryScript,
  diskScript,
  fileScript,
} from '../server/inspection-scripts';
import { Runner } from '../server/runner';
import { Terminals } from '../server/inspection-terminal';
import {
  TerminalTransport,
  type TerminalProcess,
} from '../server/inspection-terminal-transport';
class InspectionRunner extends Runner {
  readonly calls: string[][] = [];
  async run(args: string[]) {
    this.calls.push(args);
    if (args[4] === directoryScript)
      return ['d', 'src', '4096', 'f', 'quote" $HOME.txt', '20', ''].join('\0');
    if (args[4] === fileScript)
      return Buffer.from('hello\n').toString('base64');
    return [
      '4096\t/',
      '',
      '0',
      'Size Used Avail Use% Mounted on\n10000 4000 6000 40% /\n',
    ].join('\0');
  }
}
class TestTransport extends TerminalTransport {
  readonly writes: string[] = [];
  closed = 0;
  output: (text: string) => void = () => {};
  exit: (code: number | null) => void = () => {};
  start(
    _name: string,
    output: (text: string) => void,
    exit: (code: number | null) => void,
  ): TerminalProcess {
    this.output = output;
    this.exit = exit;
    return {
      write: (input) => {
        this.writes.push(input);
        output('command output\n');
      },
      close: () => {
        this.closed += 1;
        exit(0);
      },
    };
  }
}
afterEach(() => vi.useRealTimers());
describe('Sandbox inspection', () => {
  test('passes hostile paths as single positional arguments to fixed scripts', async () => {
    const runner = new InspectionRunner();
    const service = new Inspection(runner);
    const path = '/workspace/quote"; $(touch injected);\nΔ';
    await service.directory('owned-test', path);
    await service.file('owned-test', path);
    await service.disk('owned-test', path);
    expect(runner.calls).toEqual(
      [directoryScript, fileScript, diskScript].map((script) => [
        'exec',
        'owned-test',
        'bash',
        '-c',
        script,
        '--',
        path,
      ]),
    );
    await expect(service.file('owned-test', '/has\0nul')).rejects.toThrow();
    expect(runner.calls).toHaveLength(3);
  });
  test('preserves unicode, tabs and newlines in NUL-delimited filenames', () => {
    expect(
      parseDirectory(
        '/',
        [
          'f',
          'Δ\nnotes\t.txt',
          '15',
          'l',
          'shortcut',
          '10',
          'd',
          'src',
          '4096',
          '',
        ].join('\0'),
      ).entries,
    ).toEqual([
      { name: 'src', kind: 'directory', size: 4096 },
      { name: 'Δ\nnotes\t.txt', kind: 'file', size: 15 },
      { name: 'shortcut', kind: 'symlink', size: 10 },
    ]);
  });
  test('limits directory output to 500 records', () => {
    const records = Array.from({ length: 501 }, (_, index) =>
      ['f', `file-${index}`, '1', ''].join('\0'),
    ).join('');
    expect(parseDirectory('/', records)).toMatchObject({
      truncated: true,
      entries: expect.any(Array),
    });
    expect(parseDirectory('/', records).entries).toHaveLength(500);
  });
  test('views bounded UTF-8 and rejects binary, invalid UTF-8 and oversized files', () => {
    expect(
      decodeFile('/text', Buffer.from('Hello Δ\n').toString('base64')).content,
    ).toBe('Hello Δ\n');
    expect(() =>
      decodeFile('/binary', Buffer.from([1, 0]).toString('base64')),
    ).toThrow('Binary');
    expect(() =>
      decodeFile('/invalid', Buffer.from([0xff]).toString('base64')),
    ).toThrow('UTF-8');
    expect(() =>
      decodeFile('/large', Buffer.alloc(1048577, 65).toString('base64')),
    ).toThrow('1 MiB');
    expect(fileScript).toContain('[ -f "$1" ] && [ ! -L "$1" ]');
  });
  test('maps disk usage with whitespace paths and reports partial totals', () => {
    const output = [
      '9000\t/data',
      '6000\t/data/has\tspace\nΔ',
      '',
      '1',
      'Size Used Avail Use% Mounted on\n10000 4000 6000 40% /mounted folder\n',
    ].join('\0');
    expect(parseDisk('/data', output)).toEqual({
      path: '/data',
      entries: [
        { path: '/data', size: 9000 },
        { path: '/data/has\tspace\nΔ', size: 6000 },
      ],
      partial: true,
      filesystem: {
        total: 10000,
        used: 4000,
        available: 6000,
        percent: '40%',
        mount: '/mounted folder',
      },
    });
  });
});
describe('Persistent Bash sessions', () => {
  test('retains session input, incrementally streams output and restricts sandbox ownership', () => {
    const transport = new TestTransport();
    const service = new Terminals(transport);
    try {
      const session = service.start('owned-test');
      transport.output('ready\n');
      expect(service.read('owned-test', session.id).output).toBe('ready\n');
      service.send('owned-test', session.id, { input: 'cd /workspace\npwd\n' });
      expect(transport.writes).toEqual(['cd /workspace\npwd\n']);
      expect(service.read('owned-test', session.id, 6).output).toBe(
        'command output\n',
      );
      expect(() => service.close('different-test', session.id)).toThrow(
        'not found',
      );
      transport.exit(2);
      expect(service.read('owned-test', session.id).exitCode).toBe(2);
      expect(() =>
        service.send('owned-test', session.id, { input: 'pwd\n' }),
      ).toThrow('exited');
    } finally {
      service.onModuleDestroy();
    }
    expect(transport.closed).toBe(1);
  });
  test('bounds output and frees closed sessions', () => {
    const transport = new TestTransport();
    const service = new Terminals(transport);
    try {
      const session = service.start('owned-test');
      transport.output('x'.repeat(300000));
      expect(service.read('owned-test', session.id)).toMatchObject({
        dropped: true,
        cursor: 300000,
      });
      expect(service.read('owned-test', session.id).output).toHaveLength(
        256 * 1024,
      );
      service.close('owned-test', session.id);
      expect(() => service.read('owned-test', session.id)).toThrow('not found');
    } finally {
      service.onModuleDestroy();
    }
  });
  test('expires inactive sessions and enforces the eight-session limit', () => {
    vi.useFakeTimers();
    const transport = new TestTransport();
    const service = new Terminals(transport);
    try {
      for (let index = 0; index < 8; index += 1) service.start('owned-test');
      expect(() => service.start('owned-test')).toThrow('maximum 8');
      vi.advanceTimersByTime(16 * 60_000);
      expect(transport.closed).toBe(8);
      expect(service.start('owned-test').active).toBe(true);
    } finally {
      service.onModuleDestroy();
    }
  });
});
class EarlyExitTransport extends TestTransport {
  start(
    name: string,
    output: (text: string) => void,
    exit: (code: number | null) => void,
  ): TerminalProcess {
    const process = super.start(name, output, exit);
    output('Bash startup failed\n');
    exit(17);
    return process;
  }
}
class ThrowingTransport extends TerminalTransport {
  start(): TerminalProcess {
    throw new Error('Spawn rejected');
  }
}
test('preserves output and exit reported synchronously during terminal creation', () => {
  const service = new Terminals(new EarlyExitTransport());
  try {
    expect(service.start('owned-test')).toMatchObject({
      output: 'Bash startup failed\n',
      active: false,
      exitCode: 17,
    });
  } finally {
    service.onModuleDestroy();
  }
});
test('failed terminal creation does not consume session capacity', () => {
  const service = new Terminals(new ThrowingTransport());
  try {
    for (let index = 0; index < 9; index += 1)
      expect(() => service.start('owned-test')).toThrow(
        'Unable to start terminal',
      );
  } finally {
    service.onModuleDestroy();
  }
});
test('rejects malformed CLI records before exposing directory or disk results', () => {
  for (const output of [
    'startup message',
    'f\0incomplete\0',
    ['f', 'bad-size', 'no-number', ''].join('\0'),
    ['f', '', '1', ''].join('\0'),
  ])
    expect(() => parseDirectory('/', output)).toThrow('Unexpected');
  expect(() => decodeFile('/file', 'startup banner\naGVsbG8=')).toThrow(
    'Unexpected',
  );
  expect(() =>
    parseDisk(
      '/',
      [
        'not-size\t/',
        '',
        '0',
        'Size Used Avail Use% Mounted on\n10000 4000 6000 40% /',
      ].join('\0'),
    ),
  ).toThrow('Unexpected');
  expect(() => parseDisk('/', ['4\t/', '', '0'].join('\0'))).toThrow(
    'Unexpected',
  );
});
