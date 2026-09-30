import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  Inject,
  Injectable,
  Param,
  Query,
} from '@nestjs/common';
import { nameSchema } from '../shared/contracts';
import {
  inspectionPath,
  directorySchema,
  diskSchema,
  type Directory,
  type DiskUsage,
  type FileEntry,
  type SandboxFile,
} from '../shared/inspection';
import { Runner } from './runner';
import { directoryScript, diskScript, fileScript } from './inspection-scripts';
const fileLimit = 1024 * 1024;
function kind(value: string): FileEntry['kind'] {
  if (value === 'd') return 'directory';
  if (value === 'f') return 'file';
  if (value === 'l') return 'symlink';
  return 'other';
}
function compareEntries(a: FileEntry, b: FileEntry) {
  const ranks = { directory: 0, file: 1, symlink: 2, other: 3 };
  if (a.kind !== b.kind) return ranks[a.kind] - ranks[b.kind];
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}
export function parseDirectory(path: string, output: string): Directory {
  if (output && !output.endsWith('\0'))
    throw new BadGatewayException('Unexpected directory response');
  const fields = output.split('\0');
  fields.pop();
  if (fields.length % 3 !== 0)
    throw new BadGatewayException('Unexpected directory response');
  const entries: FileEntry[] = [];
  for (let index = 0; index < fields.length; index += 3) {
    if (!/^\d+$/.test(fields[index + 2]))
      throw new BadGatewayException('Unexpected file size');
    entries.push({
      kind: kind(fields[index]),
      name: fields[index + 1],
      size: Number(fields[index + 2]),
    });
  }
  const parsed = directorySchema.safeParse({
    path,
    entries: entries.slice(0, 500).sort(compareEntries),
    truncated: entries.length > 500,
  });
  if (!parsed.success)
    throw new BadGatewayException('Unexpected directory response');
  return parsed.data;
}
export function decodeFile(path: string, output: string): SandboxFile {
  const data = Buffer.from(output, 'base64');
  if (data.toString('base64') !== output)
    throw new BadGatewayException('Unexpected file response');
  if (data.length > fileLimit)
    throw new BadRequestException('File exceeds the 1 MiB viewer limit');
  if (data.some((byte) => byte < 32 && ![9, 10, 13].includes(byte)))
    throw new BadRequestException('Binary files cannot be displayed');
  try {
    return {
      path,
      size: data.length,
      content: new TextDecoder('utf-8', { fatal: true }).decode(data),
    };
  } catch {
    throw new BadRequestException('The viewer supports UTF-8 text files only');
  }
}
export function parseDisk(path: string, output: string): DiskUsage {
  const [records, tail] = output.split('\0\0');
  if (tail === undefined)
    throw new BadGatewayException('Unexpected disk usage response');
  const [status, filesystem] = tail.split('\0');
  if (!/^\d+$/.test(status) || filesystem === undefined)
    throw new BadGatewayException('Unexpected disk usage response');
  const match = filesystem
    .trim()
    .split('\n')
    .slice(-1)[0]
    .match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
  if (!match) throw new BadGatewayException('Unexpected filesystem response');
  const entries = records.split('\0').filter(Boolean).map(parseDiskEntry);
  const parsed = diskSchema.safeParse({
    path,
    entries,
    partial: status !== '0',
    filesystem: {
      total: Number(match[1]),
      used: Number(match[2]),
      available: Number(match[3]),
      percent: match[4],
      mount: match[5],
    },
  });
  if (!parsed.success)
    throw new BadGatewayException('Unexpected disk usage response');
  return parsed.data;
}
function parseDiskEntry(record: string) {
  const match = record.match(/^(\d+)\t(\/[\s\S]*)$/);
  if (!match) throw new BadGatewayException('Unexpected disk usage entry');
  return { size: Number(match[1]), path: match[2] };
}

@Injectable()
export class Inspection {
  constructor(@Inject(Runner) private readonly runner: Runner) {}
  private execute(name: string, path: string, script: string) {
    return this.runner.run([
      'exec',
      nameSchema.parse(name),
      'bash',
      '-c',
      script,
      '--',
      inspectionPath.parse(path),
    ]);
  }
  async directory(name: string, path = '/') {
    return parseDirectory(
      path,
      await this.execute(name, path, directoryScript),
    );
  }
  async file(name: string, path: string) {
    return decodeFile(path, await this.execute(name, path, fileScript));
  }
  async disk(name: string, path = '/') {
    return parseDisk(path, await this.execute(name, path, diskScript));
  }
}
@Controller('api/sandboxes/:name')
export class InspectionController {
  constructor(@Inject(Inspection) private readonly service: Inspection) {}
  @Get('files') directory(
    @Param('name') name: string,
    @Query('path') path?: string,
  ) {
    return this.service.directory(name, path);
  }
  @Get('file') file(@Param('name') name: string, @Query('path') path: string) {
    return this.service.file(name, path);
  }
  @Get('disk') disk(@Param('name') name: string, @Query('path') path?: string) {
    return this.service.disk(name, path);
  }
}
