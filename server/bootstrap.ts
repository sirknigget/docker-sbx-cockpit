import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { localRequest, HttpFilter, ValidationFilter } from './security';
import { Runner, SbxRunner } from './runner';
import {
  TerminalTransport,
  SbxTerminalTransport,
} from './inspection-terminal-transport';

export async function createApp(
  runner: Runner = new SbxRunner(),
  terminalTransport: TerminalTransport = new SbxTerminalTransport(),
) {
  const app = await NestFactory.create(
    AppModule.register(runner, terminalTransport),
    {
      logger: false,
    },
  );

  app.use(localRequest);
  app.useGlobalFilters(new HttpFilter(), new ValidationFilter());
  app.enableShutdownHooks();

  return app;
}
