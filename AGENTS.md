# Agent guide

## Context and boundaries

Docker Sandbox Cockpit is a local NestJS + React control plane, served by
`sbx-cockpit` on `127.0.0.1:9876` by default. `--port` overrides `PORT`.
README.md is human onboarding: installation, product workflows, limits and
troubleshooting. Keep architecture, contributor commands and agent rules here.

Delegate sandbox lifecycle, templates, secrets, published ports and Bash execution
to the installed `sbx` CLI. Do not replace built-in capabilities with direct
runtime manipulation. Filesystem browsing and disk scans use Linux commands
inside the sandbox through `sbx exec`.

## Project map

| Path                                                                      | Responsibility                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bin/sbx-cockpit.mjs`                                                     | CLI help and port validation; starts the compiled server.                                       |
| `server/main.ts`, `server/bootstrap.ts`, `server/module.ts`               | Local HTTP startup, injectable adapters, Nest controllers and static frontend serving.          |
| `server/runner.ts`, `server/security.ts`                                  | Bounded sbx subprocess execution, local request protection and error handling.                  |
| `server/sandboxes.ts`, `server/configuration.ts`                          | Lifecycle, templates, scoped secrets and published ports.                                       |
| `server/inspection*.ts`                                                   | Files and disk scripts, persistent terminal sessions and sbx transport.                         |
| `shared/`                                                                 | Zod request/response schemas and shared types; validate both sides of the API.                  |
| `web/app.tsx`, `web/layout.tsx`, `web/api.ts`                             | React navigation, shell and validated API client.                                               |
| `web/` feature components and CSS                                         | Sandbox creation/list/detail, templates, secrets, ports, files, disk and terminal UI.           |
| `tests/*.test.ts`                                                         | Vitest backend, CLI, subprocess and inspection tests.                                           |
| `tests/e2e/`, `tests/fixture*.ts`, `scripts/fixture-server.ts`            | Playwright workflows, screenshot baselines and in-memory CLI/terminal adapters.                 |
| `scripts/release.mts`, `scripts/package*.ts`, `scripts/package-smoke.mts` | Tag validation/version stamping, runtime archive checks and isolated global-install smoke test. |
| `scripts/live-test.mts`                                                   | Ownership-tracked live API tests; records inventories in ignored `.live-test/`.                 |
| `docs/`, `scripts/fetch-docs.py`                                          | Downloaded Docker docs, captured CLI help and Markdown downloader.                              |
| `oxlint.config.mts`, `.prettierrc.json`, `tsconfig*.json`, `*.config.ts`  | Lint, formatting, TypeScript, build and test configuration.                                     |
| `.github/workflows/`, `TASKS.md`                                          | macOS quality gate, tag-only npm publishing and completed verification evidence.                |

Build output is ignored `dist/server/` (CommonJS) and `dist/web/` (Vite).
`createApp` accepts runner and terminal adapters so fixture tests never run sbx.
The API lives under `/api`; requests require `X-Cockpit-Request: 1`, except
`/api/health`. Cross-origin requests are blocked.

## Local reference docs

Docker Sandbox documentation is already downloaded in `docs/docker-sandboxes/`:
79 original guide pages. CLI reference pages were removed from the repository;
use the captured CLI help for command options.
`docs/docker-sandboxes/manifest.json` records their sources. Read the relevant
pages and `docs/sbx-help/` before changing CLI integration. CLI help was captured
from sbx v0.46.0 on 2026-09-30. `npm run docs:fetch` refreshes Markdown sources.

## Development and checks

Install with `npm ci`; Node.js 22.12+, Git and pnpm are required (pnpm builds the
Git-pinned anti-slop dependency). Run `npm run dev` and `npm run dev:web` in
separate terminals. The Vite proxy targets port 9876; update its target when
using another backend port. `npm run build` compiles both sides; `npm start`
serves the production build.

Run `npm run check` before finishing. It runs strict Oxlint/anti-slop, Prettier,
TypeScript, Vitest, the production build, Playwright and a package smoke test.
Install Chromium with
`npx playwright install chromium` first. CI runs on macOS.

Keep the exact anti-slop limits: cognitive complexity 12, cyclomatic complexity
10, maximum file lines 500 and maximum function lines 50. Do not relax thresholds
or add broad lint suppressions. Linter warnings fail the gate. The sirknigget
anti-slop fork is pinned in `package-lock.json`.

Oxlint loads ESLint Stylistic's `padding-line-between-statements` and
`lines-between-class-members`: separate imports from code, functions, types,
control-flow steps and class methods; adjacent imports and variables can stay
grouped. Apply fixes with `npm run lint:fix`, then `npm run format`.

Browser tests use fixture data and never invoke real sbx. Screenshot goldens use
macOS Chromium from the lockfile, UTC, en-US, a 1440×1000 viewport, disabled
animations and zero pixel tolerance. Update with
`npm run test:e2e -- --update-snapshots` only after reviewing an intentional UI
change. Review platform-specific baselines before running on another OS.

Implement, verify, commit and push each vertical slice; track progress in
TASKS.md. Keep README focused on human users.

## npm releases

The package ships only `bin/`, `dist/`, README, Apache-2.0 LICENSE and package
metadata. `prepack` builds the Nest backend, shared modules and bundled React frontend. Frontend-only
libraries are dev dependencies. Users need Node.js and sbx; no build tools.
`npm run test:package` packs, validates contents, dry-runs publishing the local
archive offline, installs into a temporary global prefix, and verifies CLI help,
health and static assets from an unrelated folder.
It never invokes sbx. `PACKAGE_OUTPUT_DIR` retains the verified tarball for CI.

`.github/workflows/publish.yml` triggers only on pushed tags. The release script
rejects anything except canonical `x.x.x` and requires the tagged checkout to be
an ancestor of `origin/main`. Main pushes alone run quality checks, not publishing.
A tag can target any existing main commit containing the release workflow. The
build checkout's package and lock versions are set from the tag without creating
a commit or another tag. CI runs the full gate, then publishes that same verified
tarball with provenance.

Create releases with `git tag 0.1.0 <main-commit>` and `git push origin 0.1.0`;
replace the version with an unpublished one. Do not force or move release tags.
Publishing uses npm trusted publishing (OIDC) only, with GitHub-hosted runners,
Node 24, npm 11.10.1 and `id-token: write`. Do not add static npm credentials or
a token fallback to the workflow. In the npm package settings, select GitHub
Actions as the trusted publisher: user `sirknigget`, repository
`docker-sbx-cockpit`, workflow `publish.yml`, environment blank, and allow direct
`npm publish`. Set publishing access to require 2FA and disallow tokens;
trusted publishing continues to work with that setting.

The npm package is registered: version 0.1.0 was published interactively. After
the owner updated the trusted publisher, the 0.1.4 job successfully exchanged
its GitHub identity and published 0.1.4 with provenance. Registry installation,
CLI startup and served frontend assets were verified in temporary directories.
Future releases use tags; do not repeat registration or add automation tokens.
Keep release instructions here, and user installation instructions in README.

GitHub CLI is installed and authenticated; use `gh run view --log-failed` to
inspect release failures. Publishing logs include npm's verbose OIDC exchange
diagnostics. An identity request can succeed while npm rejects the exchange;
check the saved npm trust fields before changing workflow permissions. npm's
owner-only trust settings may require interactive 2FA. Do not log credentials.

## Live testing: preserve existing resources

Never mutate, stop, execute in, delete, or save templates from a pre-existing
sandbox. Never delete or overwrite an existing template or secret. Read-only
inventory calls are allowed. Inspection can start a stopped sandbox, so it is
not a safe read-only operation on an existing resource.

Only mutate resources freshly created by the live test. Record initial
inventories and an explicit ownership list; clean up only those exact names and
verify the original inventories are unchanged. Never use `--all`, prune or reset.
If interrupted, use `.live-test/` ownership records for cleanup.

`npm run test:live` is explicit and excluded from the default gate and CI.
`COCKPIT_TEST_BASE_TEMPLATE=repository:tag` can use an already cached base image.
macOS keychain operations may need an unsandboxed tool run. Prove ownership from
a just-created sandbox and recorded inventories before escalation; delete only
exact recorded scoped secrets.

## Integration details to preserve

- Stop the source sandbox before saving a local template; mounts and port
  mappings are excluded.
- Send service, registry and custom-value secrets through stdin, never argv.
  Do not expose values in browser responses or error output.
- File browsing, disk scans, port publishing and terminals can start stopped
  sandboxes. Keep that behavior visible to users.
- File inspection accepts regular UTF-8 files up to 1 MiB, rejects symlinks and
  nonregular files, and bounds folder results to 500 entries.
- Disk scans stay on one filesystem, time out after 60 seconds and retain partial
  results. Built-in environments supply the required GNU utilities.
- Bash sessions use `sbx exec -i`, retain state, expire after 15 idle minutes and
  have bounded output. They are command consoles without full-screen TTY support.
