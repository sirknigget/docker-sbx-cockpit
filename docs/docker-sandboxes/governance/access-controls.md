# Access controls


Access controls are expressed as policies. Local and organization pages
describe where policies apply. Network and filesystem pages describe the rules
inside those policies. MCP policies use Cedar statements instead of the network
and filesystem rule format.

## Policy scope

- [Local policy](/ai/sandboxes/governance/access-controls/local/): configure network rules on a developer machine with
  the `sbx policy` CLI.
- [Organization policies](/ai/sandboxes/governance/access-controls/organization/): manage centralized policies for an
  organization or team.

## Access surfaces

- [Network access policies](/ai/sandboxes/governance/access-controls/network/): control outbound network access from
  sandboxes. A local policy rule can match a host, or an HTTP method and path.
- [Filesystem access policies](/ai/sandboxes/governance/access-controls/filesystem/): control which host paths
  sandboxes can mount as workspaces.
- [MCP access policies](/ai/sandboxes/governance/access-controls/mcp/): control MCP server registration, tool calls,
  resources, prompts, and approval gates with Cedar policy.

