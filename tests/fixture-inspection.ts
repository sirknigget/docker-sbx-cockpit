import { BadGatewayException } from '@nestjs/common';
import {
  directoryScript,
  diskScript,
  fileScript,
} from '../server/inspection-scripts';

export function fixtureInspection(args: string[]) {
  const path = args[args.length - 1];
  if (args[4] === directoryScript)
    return [
      'd',
      'src',
      '4096',
      'f',
      'README.md',
      '74',
      'f',
      'package.json',
      '120',
      'l',
      'current',
      '3',
      'f',
      'binary.bin',
      '4',
      'f',
      'large.txt',
      '1048577',
      '',
    ].join('\0');
  if (args[4] === fileScript) return fixtureFile(path);
  if (args[4] === diskScript)
    return `524288000\t${path}\x00268435456\t${path === '/' ? '' : path}/node_modules\x00134217728\t${path === '/' ? '' : path}/src\x00\x000\x001073741824 524288000 549453824 49% /\n`;
  throw new BadGatewayException('Unsupported fixture execution');
}

function fixtureFile(path: string) {
  if (path.endsWith('/binary.bin'))
    return Buffer.from([0, 1, 2, 3]).toString('base64');
  if (path.endsWith('/large.txt'))
    return Buffer.alloc(1048577, 'x').toString('base64');
  const lines = Array.from(
    { length: 50 },
    (_, index) => `Fixture line ${index + 1}: deterministic workspace notes.`,
  );
  return Buffer.from(
    `# Atlas API\n\nA fixture workspace for deterministic browser tests.\n\n${lines.join('\n')}\n`,
  ).toString('base64');
}
