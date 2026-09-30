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

The quality gate uses the user-requested exact limits: cognitive complexity 12,
cyclomatic complexity 10, maximum file lines 500 and maximum function lines 50.
Do not relax these thresholds or add broad lint suppressions to pass the gate.
Oxlint also loads ESLint Stylistic to require blank lines after imports, around
functions and types, before control-flow statements, and between class methods.
Adjacent imports and variable declarations can stay grouped. Run
`npm run lint:fix` followed by `npm run format` to apply spacing and formatting.
Screenshot goldens use macOS Chromium, fixture data, UTC, en-US, 1440x1000 and
zero pixel tolerance. Update only after reviewing an intentional UI change.

Local template save requires stopping the source sandbox first. Service, registry
and custom-value secrets all support stdin in sbx v0.46.0; use it, never argv.
macOS keychain operations in live tests may require an unsandboxed tool run.
Prove resource ownership from a just-created sandbox and recorded inventories
before requesting escalation, and delete only exact recorded scoped secrets.
