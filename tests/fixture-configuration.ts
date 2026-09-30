import type { SecretInventory, Template } from '../shared/configuration';
import type { Sandbox } from '../shared/contracts';

function secretScope(args: string[]) {
  const index = args.indexOf('--sandbox');
  if (index >= 0) return args[index + 1];
  if (args.includes('--registry') && !args.includes('--all-sandboxes'))
    return 'host';
  return 'global';
}

export class FixtureConfiguration {
  templates: Template[] = [
    {
      id: 'fixture-template-001',
      repository: 'team/node-base',
      tag: 'v1',
      flavor: 'shell',
      created_at: '2026-09-30T00:00:00Z',
      size: 268435456,
    },
  ];
  secrets: SecretInventory = {
    secrets: [{ scope: 'global', type: 'service', name: 'openai' }],
    custom_secrets: [],
  };

  template(args: string[]) {
    if (args[1] === 'ls') return JSON.stringify({ images: this.templates });
    if (args[1] === 'save') {
      const [repository, tag = 'latest'] = args[3].split(':');
      this.templates.push({
        repository,
        tag,
        id: 'fixture-saved',
        size: 134217728,
      });
      return 'Template saved';
    }
    this.templates = this.templates.filter(
      (item) => `${item.repository}:${item.tag}` !== args[3],
    );
    return 'Template removed';
  }

  secret(args: string[]) {
    if (args[1] === 'ls') return JSON.stringify(this.secrets);
    const registryIndex = args.indexOf('--registry');
    const scope = secretScope(args);
    const name =
      registryIndex < 0
        ? args[args[1] === 'rm' ? 3 : 2]
        : args[registryIndex + 1];
    if (args[1] === 'set') {
      this.secrets.secrets.push({
        scope,
        name,
        type: registryIndex < 0 ? 'service' : 'registry',
      });
    } else if (args[1] === 'set-custom') {
      this.secrets.custom_secrets.push({
        scope,
        targets: [args[args.indexOf('--host') + 1]],
        env: args[args.indexOf('--env') + 1],
        placeholder: 'fixture-custom-placeholder',
      });
    } else {
      this.secrets.secrets = this.secrets.secrets.filter(
        (item) => item.name !== name,
      );
      const placeholderIndex = args.indexOf('--placeholder');
      if (placeholderIndex >= 0)
        this.secrets.custom_secrets = this.secrets.custom_secrets.filter(
          (item) => item.placeholder !== args[placeholderIndex + 1],
        );
    }
    return 'Secret updated';
  }

  ports(args: string[], sandbox: Sandbox) {
    if (args[2] === '--json') return JSON.stringify(sandbox.ports);
    const [mapping, protocol] = args[3].split('/');
    const parts = mapping.split(':');
    const sandboxPort = Number(parts.pop());
    const hostPort = Number(parts.pop() ?? sandboxPort);
    if (args[2] === '--publish') {
      sandbox.ports.push({
        host_ip: parts.join(':') || '127.0.0.1',
        host_port: hostPort,
        sandbox_port: sandboxPort,
        protocol,
      });
    } else {
      sandbox.ports = sandbox.ports.filter(
        (port) => port.host_port !== hostPort,
      );
    }
    return 'Ports updated';
  }
}
