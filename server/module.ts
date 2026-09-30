import { Controller, DynamicModule, Get, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { Runner, SbxRunner } from './runner';
import { Sandboxes, SandboxesController } from './sandboxes';
import { Configuration, ConfigurationController } from './configuration';
import { Inspection, InspectionController } from './inspection';
import { Terminals, TerminalsController } from './inspection-terminal';
import {
  TerminalTransport,
  SbxTerminalTransport,
} from './inspection-terminal-transport';

@Controller('api')
class HealthController {
  @Get('health') health() {
    return { status: 'ok' };
  }
}
@Module({})
export class AppModule {
  static register(
    runner: Runner = new SbxRunner(),
    terminalTransport: TerminalTransport = new SbxTerminalTransport(),
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '../web'),
          exclude: ['/api/{*path}'],
        }),
      ],
      controllers: [
        HealthController,
        SandboxesController,
        ConfigurationController,
        InspectionController,
        TerminalsController,
      ],
      providers: [
        { provide: Runner, useValue: runner },
        Sandboxes,
        Configuration,
        Inspection,
        Terminals,
        { provide: TerminalTransport, useValue: terminalTransport },
      ],
    };
  }
}
