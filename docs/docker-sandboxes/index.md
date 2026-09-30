# Docker Sandboxes


Docker Sandboxes run AI coding agents in isolated environments on your machine
or on Docker-managed cloud infrastructure. Use the `sbx` CLI to create and
manage either kind of sandbox.

The `sbx` CLI and local sandbox compute are free to use, including for commercial
work. Cloud compute uses a
[pay-as-you-go subscription](/agentic-platform/signup/#billing).
Model-provider charges are separate.

Organization admins can
[centrally manage sandbox network, filesystem, and MCP policies](/ai/sandboxes/governance/access-controls/organization/),
for local sandboxes across developer machines.
Available on a separate paid subscription.

## Get started

[Install the `sbx` CLI](/ai/sandboxes/install/) and sign in, then choose where to run your
agent:

| Environment | Use it for | Start here |
| --- | --- | --- |
| Local sandboxes | Work with files and supported hardware on your machine | [Get started locally](/ai/sandboxes/get-started/) |
| Cloud sandboxes | Run on Docker-managed compute without local virtualization | [Get started in the cloud](/ai/sandboxes/cloud/#get-started) |

The two environments have separate credentials, network policies, and lifecycle
controls. See [Compare local and cloud sandboxes](/ai/sandboxes/cloud/local-vs-cloud/)
before adapting a workflow.

To create and manage cloud sandboxes from your application, see
[Sandboxes API and SDK](/ai/sandboxes-api/).

## Learn more

The following guides describe local sandbox workflows. For cloud workflows,
see [Cloud sandboxes](/ai/sandboxes/cloud).

- [Agents](/ai/sandboxes/agents) — supported agents and per-agent configuration
- [Workflows](/ai/sandboxes/workflows) — patterns for Git, local development,
  authentication, agent skills, and automation
- [Configuration](/ai/sandboxes/configuration) — manage credentials, declare project
  environments, turn on GPU passthrough, and configure an upstream proxy
- [Integrations](/ai/sandboxes/integrations) — connect editors and apps like VS Code and
  Cursor to a sandbox over SSH
- [MCP gateway](/ai/sandboxes/mcp-gateway/) — register MCP servers and connect them to
  sandboxed agents
- [Kits](/ai/sandboxes/customize) — package tools and configuration into reusable
  sandbox environments
- [Architecture](/ai/sandboxes/architecture/) — microVM isolation, workspace mounting,
  networking
- [Security](/ai/sandboxes/security) — isolation model, credential handling, and
  network policies
- [CLI reference](/reference/cli/sbx/) — full list of `sbx` commands and options
- [Troubleshooting](/ai/sandboxes/troubleshooting/) — common issues and fixes
- [FAQ](/ai/sandboxes/faq/) — login requirements, telemetry, etc

## Feedback

Your feedback shapes what gets built next. If you run into a bug, hit a
missing feature, or have a suggestion, open an issue at
[github.com/docker/sbx-releases/issues](https://github.com/docker/sbx-releases/issues).

