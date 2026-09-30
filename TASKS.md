# Verifiable vertical slices

1. Foundation: local Markdown docs, CLI help, NestJS/React build, port CLI, quality gates.
   Verify docs manifest, CLI help/port validation, health endpoint and build.
2. Sandbox lifecycle: inventory, create (agent/shell, workspaces, template), stop/delete.
   Verify exact CLI arguments and fixture-backed browser lifecycle.
3. Runtime configuration: template list/save/delete, scoped secrets, published ports.
   Verify backend routes and fixture-backed forms, errors and confirmation.
4. Sandbox inspection: folder exploration, bounded text viewer, disk usage, Bash console.
   Verify hostile filenames, large/binary files, execution bounds and terminal lifecycle.
5. Release validation: complete deterministic screenshots and safe live tests, CI and README.
   Run all quality gates, live-test only owned temporary resources, commit and push.

Progress: slice 1 complete. All 198 Markdown pages fetched (79 guides + 119 CLI reference pages); CLI help captured.
Oxlint/anti-slop, Prettier, typecheck, CLI tests, production build and live health
endpoint on custom port 19876 passed.

Slice 2 complete: lifecycle Nest endpoints and React UI. Six backend/security
tests and five fixture-backed browser tests pass, including two exact screenshot
baselines. New temporary sandbox creation verified live; existing resources untouched.
