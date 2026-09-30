import { Controller, Get, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
@Controller('api')
class HealthController {
  @Get('health') health() {
    return { status: 'ok' };
  }
}
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../web'),
      exclude: ['/api/{*path}'],
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
