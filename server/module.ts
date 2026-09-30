import { Controller, DynamicModule, Get, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { Runner, SbxRunner } from './runner';
import { Sandboxes, SandboxesController } from './sandboxes';
@Controller('api')
class HealthController {
  @Get('health') health() {
    return { status: 'ok' };
  }
}
@Module({})
export class AppModule {
  static register(runner: Runner = new SbxRunner()): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '../web'),
          exclude: ['/api/{*path}'],
        }),
      ],
      controllers: [HealthController, SandboxesController],
      providers: [{ provide: Runner, useValue: runner }, Sandboxes],
    };
  }
}
