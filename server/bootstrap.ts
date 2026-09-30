import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { localRequest, HttpFilter, ValidationFilter } from './security';
import { Runner, SbxRunner } from './runner';
export async function createApp(runner: Runner = new SbxRunner()) {
  const app = await NestFactory.create(AppModule.register(runner), {
    logger: false,
  });
  app.use(localRequest);
  app.useGlobalFilters(new HttpFilter(), new ValidationFilter());
  app.enableShutdownHooks();
  return app;
}
