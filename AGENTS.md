# Docker Sandbox Cockpit

Docker Sandbox documentation is already downloaded in `docs/docker-sandboxes/`.
Read those Markdown files and `docs/sbx-help/` before changing CLI integration.
`manifest.json` records every fetched source; `npm run docs:fetch` refreshes them.
The installed CLI help was captured from sbx v0.46.0 on 2026-09-30.

Use NestJS for the local backend and React for the frontend. Delegate sandbox
lifecycle, templates, secrets, published ports and Bash execution to `sbx`.
Never replace CLI capabilities with direct runtime manipulation.

Live testing MUST NOT mutate, stop, execute in, delete, or save templates from
any pre-existing sandbox. Never delete or overwrite an existing template or
secret. Only mutate resources freshly created by the live test; keep an explicit
ownership list and clean up those exact names. Never use `--all`, prune or reset.
Read-only inventory calls are allowed. Fixture tests do not invoke real sbx.

Run `npm run check` before finishing. Anti-slop (sirknigget fork, Git-pinned
through package-lock), Oxlint, Prettier, type checks, backend integration tests
and deterministic Playwright screenshot snapshots are quality gates.

Implement and push each verifiable vertical slice; track progress in TASKS.md.
