import { spawn } from 'node:child_process';

export interface TerminalProcess {
  write(input: string): void;
  close(): void;
}

export abstract class TerminalTransport {
  abstract start(
    name: string,
    output: (text: string) => void,
    exit: (code: number | null) => void,
  ): TerminalProcess;
}

export class SbxTerminalTransport extends TerminalTransport {
  start(
    name: string,
    output: (text: string) => void,
    exit: (code: number | null) => void,
  ): TerminalProcess {
    const child = spawn(
      'sbx',
      ['exec', '-i', name, 'bash', '--noprofile', '--norc'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', output);
    child.stderr.on('data', output);
    child.stdin.on('error', (error: Error) =>
      output(`\nInput closed: ${error.message}\n`),
    );
    child.on('error', (error: Error) =>
      output(`\nUnable to start sbx: ${error.message}\n`),
    );
    child.on('close', exit);

    return {
      write: (input) => {
        child.stdin.write(input);
      },
      close: () => {
        child.stdin.end();
        child.kill('SIGTERM');

        const timer = setTimeout(() => {
          child.kill('SIGKILL');
        }, 2000);

        timer.unref();
        child.once('close', () => clearTimeout(timer));
      },
    };
  }
}
