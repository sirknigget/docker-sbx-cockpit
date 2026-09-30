import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Param,
  Post,
  Query,
  HttpException,
} from '@nestjs/common';
import { z } from 'zod';
import { nameSchema } from '../shared/contracts';
import {
  terminalInputSchema,
  type TerminalInput,
  type TerminalState,
} from '../shared/inspection';
import {
  TerminalTransport,
  type TerminalProcess,
} from './inspection-terminal-transport';

interface Session {
  id: string;
  sandbox: string;
  output: string;
  cursor: number;
  active: boolean;
  exitCode: number | null;
  lastInput: number;
  process?: TerminalProcess;
}

const retainedCharacters = 256 * 1024;

@Injectable()
export class Terminals implements OnModuleDestroy {
  private readonly sessions = new Map<string, Session>();
  private readonly timer = setInterval(() => this.expire(), 60_000);

  constructor(
    @Inject(TerminalTransport) private readonly transport: TerminalTransport,
  ) {
    this.timer.unref();
  }

  start(name: string): TerminalState {
    const sandbox = nameSchema.parse(name);

    this.expire();

    if (this.sessions.size >= 8)
      throw new HttpException(
        'Close an existing terminal before opening another (maximum 8)',
        429,
      );

    const id = randomUUID();
    const session: Session = {
      id,
      sandbox,
      output: '',
      cursor: 0,
      active: true,
      exitCode: null,
      lastInput: Date.now(),
    };

    this.sessions.set(id, session);

    try {
      session.process = this.transport.start(
        sandbox,
        (text) => this.append(id, text),
        (code) => this.exited(id, code),
      );
    } catch {
      this.sessions.delete(id);
      throw new BadGatewayException('Unable to start terminal');
    }

    return this.snapshot(session, 0);
  }

  read(name: string, id: string, cursor = 0): TerminalState {
    return this.snapshot(this.session(name, id), cursor);
  }

  send(name: string, id: string, input: TerminalInput): TerminalState {
    const session = this.session(name, id);
    const request = terminalInputSchema.parse(input);

    if (!session.active || !session.process)
      throw new BadRequestException('This terminal has exited');
    session.lastInput = Date.now();
    session.process.write(request.input);

    return this.snapshot(session, session.cursor);
  }

  close(name: string, id: string) {
    const sandbox = nameSchema.parse(name);
    const session = this.sessions.get(z.string().uuid().parse(id));

    if (!session) return { output: 'Terminal closed' };

    if (session.sandbox !== sandbox)
      throw new NotFoundException('Terminal session not found');
    session.process?.close();
    this.sessions.delete(id);

    return { output: 'Terminal closed' };
  }

  private session(name: string, id: string): Session {
    const session = this.sessions.get(z.string().uuid().parse(id));

    if (!session || session.sandbox !== nameSchema.parse(name))
      throw new NotFoundException('Terminal session not found');

    return session;
  }

  private snapshot(session: Session, cursor: number): TerminalState {
    const start = session.cursor - session.output.length;

    return {
      id: session.id,
      sandbox: session.sandbox,
      active: session.active,
      exitCode: session.exitCode,
      cursor: session.cursor,
      dropped: cursor < start,
      output: session.output.slice(Math.max(0, cursor - start)),
    };
  }

  private append(id: string, text: string) {
    const session = this.sessions.get(id);

    if (!session) return;
    session.cursor += text.length;
    session.output = (session.output + text).slice(-retainedCharacters);
  }

  private exited(id: string, code: number | null) {
    const session = this.sessions.get(id);

    if (session) {
      session.active = false;
      session.exitCode = code;
    }
  }

  private expire() {
    for (const [id, session] of this.sessions) {
      if (Date.now() - session.lastInput > 15 * 60_000) {
        session.process?.close();
        this.sessions.delete(id);
      }
    }
  }

  onModuleDestroy() {
    clearInterval(this.timer);

    for (const session of this.sessions.values()) session.process?.close();
    this.sessions.clear();
  }
}

@Controller('api/sandboxes/:name/terminal')
export class TerminalsController {
  constructor(@Inject(Terminals) private readonly service: Terminals) {}

  @Post() start(@Param('name') name: string) {
    return this.service.start(name);
  }

  @Get(':id') read(
    @Param('name') name: string,
    @Param('id') id: string,
    @Query('cursor') cursor = '0',
  ) {
    return this.service.read(
      name,
      id,
      z.coerce.number().int().min(0).parse(cursor),
    );
  }

  @Post(':id/input') send(
    @Param('name') name: string,
    @Param('id') id: string,
    @Body() input: TerminalInput,
  ) {
    return this.service.send(name, id, input);
  }

  @Delete(':id') close(@Param('name') name: string, @Param('id') id: string) {
    return this.service.close(name, id);
  }
}
