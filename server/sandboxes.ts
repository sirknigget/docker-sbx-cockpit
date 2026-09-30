import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Param,
  Post,
} from '@nestjs/common';
import {
  createSchema,
  inventorySchema,
  nameSchema,
  type CreateSandbox,
} from '../shared/contracts';
import { Runner } from './runner';
@Injectable()
export class Sandboxes {
  constructor(@Inject(Runner) private readonly runner: Runner) {}
  async list() {
    return inventorySchema.parse(
      JSON.parse(await this.runner.run(['ls', '--json'])),
    );
  }
  async create(input: CreateSandbox) {
    const request = createSchema.parse(input);
    const args = ['create', '--name', request.name];
    if (request.template)
      args.push('--template', request.template, '--pull', 'never');
    args.push(request.agent, ...request.workspaces);
    return { output: await this.runner.run(args, undefined, 600_000) };
  }
  async stop(name: string) {
    return { output: await this.runner.run(['stop', nameSchema.parse(name)]) };
  }
  async remove(name: string) {
    return {
      output: await this.runner.run(['rm', '--force', nameSchema.parse(name)]),
    };
  }
}
@Controller('api/sandboxes')
export class SandboxesController {
  constructor(@Inject(Sandboxes) private readonly service: Sandboxes) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() input: CreateSandbox) {
    return this.service.create(input);
  }
  @Post(':name/stop') stop(@Param('name') name: string) {
    return this.service.stop(name);
  }
  @Delete(':name') remove(@Param('name') name: string) {
    return this.service.remove(name);
  }
}
