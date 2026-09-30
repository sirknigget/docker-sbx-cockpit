import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { nameSchema } from '../shared/contracts';
import {
  portsSchema,
  portSpec,
  publishPortSchema,
  removeSecretSchema,
  removeTemplateSchema,
  saveTemplateSchema,
  scopeSchema,
  secretsSchema,
  setSecretSchema,
  templatesSchema,
  unpublishPortSchema,
  type PublishPort,
  type RemoveSecret,
  type SetSecret,
} from '../shared/configuration';
import { Runner } from './runner';
function scopeArgs(scope: string, registry = false) {
  if (scope === 'host') return [];
  if (scope === 'global') return registry ? ['--all-sandboxes'] : [];
  return ['--sandbox', nameSchema.parse(scope)];
}
function secretArgs(input: SetSecret) {
  const args = ['secret', input.kind === 'custom' ? 'set-custom' : 'set'];
  if (input.kind === 'service') args.push(input.name);
  if (input.kind === 'registry') {
    args.push('--registry', input.name, '--password-stdin');
    if (input.username) args.push('--username', input.username);
  }
  if (input.kind === 'custom') {
    for (const host of input.hosts) args.push('--host', host);
    args.push('--env', input.env);
    if (input.reference) args.push('--ref', input.reference);
  }
  args.push(...scopeArgs(input.scope, input.kind === 'registry'));
  return args;
}
@Injectable()
export class Configuration {
  constructor(@Inject(Runner) private readonly runner: Runner) {}
  async templates() {
    return templatesSchema.parse(
      JSON.parse(await this.runner.run(['template', 'ls', '--json'])),
    );
  }
  async saveTemplate(input: z.infer<typeof saveTemplateSchema>) {
    const request = saveTemplateSchema.parse(input);
    return {
      output: await this.runner.run(
        ['template', 'save', request.sandbox, request.reference],
        undefined,
        600_000,
      ),
    };
  }
  async removeTemplate(input: z.infer<typeof removeTemplateSchema>) {
    const request = removeTemplateSchema.parse(input);
    return {
      output: await this.runner.run([
        'template',
        'rm',
        '--force',
        request.reference,
      ]),
    };
  }
  async secrets(scope?: string) {
    const args = ['secret', 'ls', '--json'];
    if (scope) {
      const parsed = scopeSchema.parse(scope);
      if (parsed === 'global') args.push('--global');
      else if (parsed !== 'host') args.push('--sandbox', parsed);
    }
    const result = secretsSchema.parse(
      JSON.parse(await this.runner.run(args, '')),
    );
    if (scope === 'host')
      return {
        secrets: result.secrets.filter((secret) => secret.scope === 'host'),
        custom_secrets: [],
      };
    return result;
  }
  async setSecret(input: SetSecret) {
    const request = setSecretSchema.parse(input);
    if (request.kind !== 'registry' && request.scope === 'host')
      throw new BadRequestException(
        'Host-only scope is available for registry credentials',
      );
    await this.runner.run(secretArgs(request), request.value ?? '');
    return { output: 'Secret saved' };
  }
  async removeSecret(input: RemoveSecret) {
    const request = removeSecretSchema.parse(input);
    if (request.kind !== 'registry' && request.scope === 'host')
      throw new BadRequestException(
        'Host-only scope is available for registry credentials',
      );
    const args = ['secret', 'rm', '--force'];
    if (request.kind === 'service') args.push(request.name);
    else if (request.kind === 'registry') args.push('--registry', request.name);
    else args.push('--placeholder', request.placeholder);
    args.push(...scopeArgs(request.scope, request.kind === 'registry'));
    await this.runner.run(args, '');
    return { output: 'Secret removed' };
  }
  async ports(sandbox: string) {
    const response = JSON.parse(
      await this.runner.run(['ports', nameSchema.parse(sandbox), '--json']),
    );
    return portsSchema.parse(
      Array.isArray(response) ? { ports: response } : response,
    );
  }
  async publish(sandbox: string, input: PublishPort) {
    const request = publishPortSchema.parse(input);
    return {
      output: await this.runner.run([
        'ports',
        nameSchema.parse(sandbox),
        '--publish',
        portSpec(request),
      ]),
    };
  }
  async unpublish(sandbox: string, input: PublishPort) {
    const request = unpublishPortSchema.parse(input);
    return {
      output: await this.runner.run([
        'ports',
        nameSchema.parse(sandbox),
        '--unpublish',
        portSpec(request),
      ]),
    };
  }
}
@Controller('api')
export class ConfigurationController {
  constructor(@Inject(Configuration) private readonly service: Configuration) {}
  @Get('templates') templates() {
    return this.service.templates();
  }
  @Post('templates') saveTemplate(
    @Body() input: z.infer<typeof saveTemplateSchema>,
  ) {
    return this.service.saveTemplate(input);
  }
  @Delete('templates') removeTemplate(
    @Body() input: z.infer<typeof removeTemplateSchema>,
  ) {
    return this.service.removeTemplate(input);
  }
  @Get('secrets') secrets(@Query('scope') scope?: string) {
    return this.service.secrets(scope);
  }
  @Post('secrets') setSecret(@Body() input: SetSecret) {
    return this.service.setSecret(input);
  }
  @Delete('secrets') removeSecret(@Body() input: RemoveSecret) {
    return this.service.removeSecret(input);
  }
  @Get('sandboxes/:name/ports') ports(@Param('name') name: string) {
    return this.service.ports(name);
  }
  @Post('sandboxes/:name/ports') publish(
    @Param('name') name: string,
    @Body() input: PublishPort,
  ) {
    return this.service.publish(name, input);
  }
  @Delete('sandboxes/:name/ports') unpublish(
    @Param('name') name: string,
    @Body() input: PublishPort,
  ) {
    return this.service.unpublish(name, input);
  }
}
