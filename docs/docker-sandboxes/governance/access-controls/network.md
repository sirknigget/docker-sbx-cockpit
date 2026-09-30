# Network access policies


The governance described here applies to local sandboxes. Cloud sandboxes
use separate network policy configuration. See
[Cloud network policy](/ai/sandboxes/governance/cloud/network-policy/) for cloud controls.

Network access policies control outbound connections from sandboxes. Each
policy contains one or more rules that allow the domains, IP ranges, and ports a
workflow needs, or block destinations that should stay unavailable. A local
policy rule can also match the HTTP method and path of a request, so it can
allow part of an API without allowing all of it.

You can configure network access in two places:

- [Local policy](/ai/sandboxes/governance/access-controls/network/local/), which applies to sandboxes on one developer machine
  when organization governance is not active.
- [Organization policies](/ai/sandboxes/governance/access-controls/network/organization/), which apply centrally across an
  organization or to selected teams.

When organization governance is active, only organization allow rules grant
network access. Local allow rules are inactive until organization governance no
longer applies, while local deny rules still apply on top of the organization
policy. See [Precedence](/ai/sandboxes/governance/access-controls/concepts/#precedence).

## Rule syntax

Network rules use `connect:tcp` for TCP and `connect:udp` for UDP. Resources are
hostnames, CIDR ranges, ports, or hostnames with ports. UDP requires
[experimental outbound UDP](/ai/sandboxes/governance/access-controls/network/local/#allow-outbound-udp). ICMP is blocked.

Examples:

- `api.example.com`
- `*.example.com`
- `**.example.com`
- `example.com:443`
- `10.0.0.0/8`

For exact wildcard behavior and CIDR support, see
[Network rules](/ai/sandboxes/governance/access-controls/concepts/#network-rules).

## HTTP method and path rules

A network rule matches a destination, so it allows or blocks everything a
sandbox sends there. An HTTP rule narrows the match to specific HTTP methods
and URL paths on that destination, which lets a policy allow reads from an API
without allowing writes to it.

HTTP rules layer on top of network rules. A network allow is the baseline for
a destination and HTTP rules carve into it, while a network deny blocks the
destination outright and no HTTP allow can reopen it. For the pattern syntax
and the full matching table, see
[HTTP rules](/ai/sandboxes/governance/access-controls/concepts/#http-method-and-path).

Add them to a local policy with `--method` and `--path` on `sbx policy`. See
[HTTP method and path rules](/ai/sandboxes/governance/access-controls/network/local/#http-method-and-path-rules).

## Local network rules

Use `sbx policy allow network` and `sbx policy deny network` to manage local
network rules:

```console
$ sbx policy allow network api.example.com
$ sbx policy deny network ads.example.com
```

For presets, sandbox-scoped rules, testing, and troubleshooting, see
[Local policy](/ai/sandboxes/governance/access-controls/network/local/).

## Organization network rules

Organization network rules belong to policies that can apply to the whole
organization or to selected teams. For setup steps and team scoping, see
[Organization policies](/ai/sandboxes/governance/access-controls/network/organization/).

Use [Monitoring policies](/ai/sandboxes/governance/access-controls/monitor-and-enforce/monitoring/) to inspect
which network rules are active on a developer machine.

> [!NOTE]
> To manage Model Context Protocol (MCP) server registration and requests
> through Docker's MCP gateway, use [MCP access policies](/ai/sandboxes/governance/access-controls/network/mcp/). These
> policies apply only to the gateway. Direct MCP connections from a sandbox
> don't use the gateway, but you can control access to remote MCP servers with
> network policy.

