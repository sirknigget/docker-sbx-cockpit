# Docker Sandbox Cockpit

A local NestJS + React control plane for Docker Sandboxes. All sandbox lifecycle,
template, secret, port, and Bash operations go through the installed `sbx` CLI.

## Run

Requires Node.js 22.12+, Git, pnpm (for building the pinned anti-slop Git dependency),
and Docker Sandboxes with `sbx` on PATH. Tested with sbx v0.46.0.

```sh
npm ci
npm run build
npm start                         # http://127.0.0.1:9876
npm start -- --port 9880
node bin/sbx-cockpit.mjs -p 9880
# Optional command installation:
npm link
sbx-cockpit --port 9880
```

The CLI also accepts `PORT` as the default. It binds only to `127.0.0.1`.
CLI arguments take precedence over `PORT`; `--help` shows usage. Run it from any
working directory after installation. `sbx` errors appear in the UI, including
missing Docker services, unsupported options and image-pull failures.

For development, run `npm run dev` and `npm run dev:web` in separate terminals.
The Vite proxy targets the backend on port 9876. `PORT=...` applies to the NestJS
server; update the Vite target when using a different development backend port.

## Features

- List, create, stop, and delete local sandboxes. Choose a built-in agent or pure
  Bash, optional saved template, and multiple host workspace mounts (`:ro` supported).
- List, save, delete, and create sandboxes from local templates. Stop the source
  sandbox before saving; mounted workspaces and port mappings are excluded.
- List and manage service and registry secrets by global, host or sandbox scope.
  Custom secrets accept values or 1Password/AWS Secrets Manager references. Values are passed
  through stdin and never returned to the browser or included in API error output.
  Registry host-scope deletion follows sbx semantics and also removes the global
  entry for that registry; the confirmation explains this.
- Publish and remove ports with ephemeral or explicit host bindings, IPv4/IPv6,
  and `tcp`, `tcp4`, `tcp6`, `udp`, `udp4`, or `udp6`.
- Browse sandbox folders and read UTF-8 regular files up to 1 MiB in a scrollable
  viewer. Binary files, symlinks, devices and FIFOs are rejected. Directory results
  are bounded to 500 entries and indicate truncation.
- Inspect filesystem capacity and the largest immediate directories using `du`
  and `df`. Scans stay on one filesystem, time out after 60 seconds, and report
  partial totals when permissions prevent a complete scan. Browse a listed large
  directory by entering its path for a narrower scan.
- Open a persistent Bash console using `sbx exec -i ... bash --noprofile --norc`.
  Commands retain the current directory and variables, and output streams by
  polling. This is a pipe-based command console: full-screen TTY programs are
  not supported. Close it to end a running command. At most eight sessions run
  simultaneously; idle sessions expire after 15 minutes and output is bounded.

File inspection, disk scans, port publishing and opening a console start stopped
sandboxes, as `sbx exec`/`sbx ports` do. Filesystem inspection assumes the standard
Linux GNU utilities provided by the shell/agent templates (`find`, `head`, `stat`,
`base64`, `sort`, `du`, `df`, `bash`). Unsupported custom images return CLI errors.

The server blocks cross-origin requests and requires the Cockpit request header
for every API operation except health. This protects inspection requests that
can start sandboxes, too. To inspect the API manually:

```sh
curl -H 'X-Cockpit-Request: 1' http://127.0.0.1:9876/api/sandboxes
```

## Quality gates and tests

```sh
npx playwright install chromium
npm run check
```

`check` runs Oxlint with the sirknigget anti-slop fork, Prettier, TypeScript,
backend integration tests, the production build, and Playwright browser tests.
The anti-slop dependency is pinned to a Git revision in `package-lock.json`.
Complexity limits are cognitive 12, cyclomatic 10, file length 500 and function
length 50. Linter warnings also fail the gate.

Browser tests run a real NestJS server with injected in-memory CLI and terminal
adapters. They never invoke real sbx. Fixtures fix resource names, statuses,
paths and content. Screenshot checks use Chromium from the lockfile, a fixed
1440×1000 viewport, en-US locale, UTC timezone and disabled animations, with zero
pixel differences allowed. The nine committed baselines were captured on macOS;
the CI gate runs on macOS. Review and commit platform-specific baselines before
running screenshot gates on another OS. To intentionally update them:

```sh
npm run test:e2e -- --update-snapshots
```

The separate live test uses only freshly created resources and records its
ownership and initial inventory under ignored `.live-test/`. It exercises the
API, removes only exact owned names, and verifies original sandbox/template/secret
inventories remain unchanged. It never prunes or resets. Run explicitly:

```sh
npm run test:live
# Optional: read an already cached base image without pulling or modifying it.
COCKPIT_TEST_BASE_TEMPLATE=repository:tag npm run test:live
```

Live tests require OS keychain access for the temporary sandbox-scoped dummy
secret. They are intentionally excluded from CI and the default quality gate.
If interrupted, use the recorded ownership file to clean up only the named test
resources; preserve all pre-existing resources.

## Local documentation

`docs/docker-sandboxes/` already contains 198 original Markdown pages: 79 Docker
Sandbox guides and subsections plus 119 linked sbx CLI reference pages. The source
manifest records each URL. The downloader discovers pages from Docker's sitemap
and fetches only `.md` page bodies. Run `npm run docs:fetch` to refresh them.
`docs/sbx-help/` contains help captured from the installed CLI. `AGENTS.md`
documents how to use these sources and the strict live-testing rules.

See `TASKS.md` for the five verified vertical slices and their test evidence.
