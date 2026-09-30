import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
async function main() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 9876);
  await app.listen(port, '127.0.0.1');
  console.log(`Docker Sandbox Cockpit: http://127.0.0.1:${port}`);
}
void main();
