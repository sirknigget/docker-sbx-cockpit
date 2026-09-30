import { BadGatewayException } from '@nestjs/common';
import type { Sandbox } from '../shared/contracts';
import { Runner } from '../server/runner';
import { FixtureConfiguration } from './fixture-configuration';
import { fixtureInspection } from './fixture-inspection';

const initialSandboxes: Sandbox[] = [
  {
    name: 'atlas-api',
    id: 'fixture-atlas-001',
    agent: 'codex',
    status: 'running',
    workspaces: ['/workspace/atlas-api'],
    ports: [
      {
        host_ip: '127.0.0.1',
        host_port: 3000,
        sandbox_port: 3000,
        protocol: 'tcp',
      },
    ],
    created_at: '2026-09-30T00:00:00Z',
  },
  {
    name: 'docs-lab',
    id: 'fixture-docs-002',
    agent: 'claude',
    status: 'running',
    workspaces: ['/workspace/docs-lab:ro'],
    ports: [],
    created_at: '2026-09-30T00:00:00Z',
  },
  {
    name: 'shell-tools',
    id: 'fixture-shell-003',
    agent: 'shell',
    status: 'stopped',
    workspaces: [],
    ports: [],
    created_at: '2026-09-30T00:00:00Z',
  },
];

/** In-memory sbx adapter. No fixture command launches a process. */
export class FixtureRunner extends Runner {
  sandboxes = structuredClone(initialSandboxes);
  commands: string[][] = [];
  configuration = new FixtureConfiguration();

  reset() {
    this.sandboxes = structuredClone(initialSandboxes);
    this.commands = [];
    this.configuration = new FixtureConfiguration();
  }

  async run(args: string[]): Promise<string> {
    this.commands.push([...args]);

    if (args[0] === 'ls') return JSON.stringify({ sandboxes: this.sandboxes });

    if (args[0] === 'create') return this.create(args);

    if (args[0] === 'template')
      return this.configuration.template(args, this.sandboxes);

    if (args[0] === 'secret') return this.configuration.secret(args);

    if (args[0] === 'ports')
      return this.configuration.ports(args, this.find(args[1]));

    if (args[0] === 'exec') return fixtureInspection(args);

    if (args[0] === 'stop') {
      this.find(args[1]).status = 'stopped';

      return `Stopped ${args[1]}`;
    }

    if (args[0] === 'rm') {
      this.sandboxes = this.sandboxes.filter((item) => item.name !== args[2]);

      return `Removed ${args[2]}`;
    }

    throw new BadGatewayException(
      `Unsupported fixture command: ${args.join(' ')}`,
    );
  }

  private find(name: string) {
    const sandbox = this.sandboxes.find((item) => item.name === name);

    if (!sandbox)
      throw new BadGatewayException(`Sandbox ${name} does not exist`);

    return sandbox;
  }

  private create(args: string[]) {
    const name = args[args.indexOf('--name') + 1];

    if (name === 'fail-create')
      throw new BadGatewayException('Fixture daemon unavailable. Try again.');

    const agentIndex = args.includes('--template') ? 7 : 3;

    this.sandboxes.push({
      name,
      id: `fixture-${name}`,
      agent: args[agentIndex],
      status: 'running',
      workspaces: args.slice(agentIndex + 1),
      ports: [],
      created_at: '2026-09-30T00:00:00Z',
    });

    return `Created ${name}`;
  }
}
