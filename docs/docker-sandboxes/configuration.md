# Configure Docker Sandboxes


Configure credentials and how Docker Sandboxes run for a project, host, or
network environment. These settings control sandbox creation, authentication,
and connectivity. To change the tools and agent configuration inside a
sandbox, see [Customize](/ai/sandboxes/customize).

- [Settings](/ai/sandboxes/configuration/settings/) lists host-level settings, environment variable
  equivalents, and commands to inspect and change values.
- [Credentials](/ai/sandboxes/configuration/credentials/) configures API keys, authentication
  credentials, and registry access for sandboxed agents.
- [Models](/ai/sandboxes/configuration/models/) selects local models, hosted providers, or custom
  inference endpoints for sandboxed agents.
- [Environment files](/ai/sandboxes/configuration/environment-files/) declare reusable project
  configuration in `sbxenv.yaml` for local or cloud sandboxes.
- [GPU passthrough](/ai/sandboxes/configuration/gpu-passthrough/) configures a Linux host and sandbox for
  NVIDIA GPU workloads.
- [Registry mirror](/ai/sandboxes/configuration/registry-mirror/) routes Docker Hub template, kit, and
  in-sandbox Docker image pulls through an organization's registry mirror.
- [Upstream proxy](/ai/sandboxes/configuration/upstream-proxy/) routes sandbox and daemon traffic through
  an operating system or corporate proxy.

