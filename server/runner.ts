import { spawn, type ChildProcess } from 'node:child_process';
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';

export abstract class Runner {
  abstract run(
    args: string[],
    stdin?: string,
    timeout?: number,
  ): Promise<string>;
}

export class SbxRunner extends Runner {
  async run(args: string[], stdin?: string, timeout = 60_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sbx', args, { stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks: Buffer[] = [];
      let size = 0;
      let exceeded = false;
      const timer = deadline(child, reject, timeout);
      const collect = (chunk: Buffer) => {
        size += chunk.length;

        if (size > 2 * 1024 * 1024) {
          exceeded = true;
          child.kill('SIGKILL');
        } else chunks.push(chunk);
      };

      const stdout: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => {
        collect(chunk);

        if (!exceeded) stdout.push(chunk);
      });
      child.stderr.on('data', collect);
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(new BadGatewayException(`Unable to run sbx: ${error.message}`));
      });
      child.on('close', (code) => {
        clearTimeout(timer);

        if (exceeded)
          return reject(
            new BadGatewayException('sbx output exceeded the 2 MiB limit'),
          );

        if (code !== 0)
          return reject(
            new BadGatewayException(
              stdin === undefined
                ? Buffer.concat(chunks).toString().slice(-8000)
                : 'sbx secret operation failed. Check the service, scope and CLI configuration.',
            ),
          );
        resolve(Buffer.concat(stdout).toString());
      });
      child.stdin.on('error', () => {
        /* sbx may close input before process exit. */
      });
      child.stdin.end(stdin);
    });
  }
}

function deadline(
  child: ChildProcess,
  reject: (error: Error) => void,
  timeout: number,
) {
  return setTimeout(() => {
    child.kill('SIGKILL');
    reject(
      new GatewayTimeoutException(
        'sbx timed out; check the resource inventory before retrying.',
      ),
    );
  }, timeout);
}
