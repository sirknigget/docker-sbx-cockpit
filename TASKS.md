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

Slice 3 complete: template list/save/delete/reuse, scoped service and registry
secrets, custom secret references, and all six published-port protocols.
22 backend configuration tests and six browser tests pass; three exact screenshot
baselines cover templates, secrets and ports. Runner output/timeouts verified with
eight tests using a fake executable. API reads now require a same-origin request
header because inspection can start stopped sandboxes.

Slice 4 complete: NUL-safe folder browsing, bounded 1 MiB UTF-8 file viewer,
same-filesystem largest-directory disk map, and persistent Bash via `sbx exec -i`.
13 inspection tests pass (including actual local Bash pipeline checks on owned
temporary files); five inspection browser tests and four screenshot baselines pass.
All 17 browser tests compare exactly. Template saving requires a stopped local
sandbox; UI now offers stopped sources only. Full live API verification passed
using only freshly created sandbox/template/scoped-secret/port resources; cleanup
and unchanged original inventories verified. Custom secrets also accept direct
values through stdin (confirmed on a freshly created, owned sandbox); both
reference and direct-value flows have backend and browser tests.

Slice 5 complete: documented installation, CLI options, operating limits,
macOS screenshot reproduction and safe live-test ownership. CI runs the complete
quality gate on macOS with the pinned Chromium. Final `npm run check` passed:
strict anti-slop/Oxlint (zero linter warnings), Prettier, TypeScript, 53 backend/CLI
tests, production build, and 17 browser tests with nine exact screenshot baselines.
Final live API test also passed service and custom-value secrets, port publishing,
template save/reuse, files, disk and persistent Bash; all owned resources cleaned.
Original sandbox (including last-used timestamp), all three original templates
and original secret inventory remain unchanged. Development server startup and
production CLI startup on a custom port verified.

All five slices are complete and pushed as separate commits.

Spacing follow-up complete: Oxlint loads ESLint Stylistic statement padding and
class-member spacing rules. All source was autofixed, with no non-blank-line
source changes. `npm run lint:fix` applies spacing; Prettier retains it. The full
quality gate passed with the unchanged anti-slop limits, 53 backend/CLI tests,
17 browser tests and all nine exact screenshot baselines.

Documentation follow-up complete: README now covers human installation, first
sandbox creation, product workflows, limits and troubleshooting. AGENTS.md holds
the project map, development and testing commands, CLI integration context and
resource ownership rules. The full quality gate passed; application code and
screenshot baselines are unchanged.

npm release follow-up: package includes the CLI and compiled backend/shared/web
assets, with frontend libraries kept out of runtime dependencies. Global install
smoke checks validate archive contents, the installed version, CLI help, health
and frontend assets from another working directory, without invoking sbx.
The tag-only publish workflow accepts canonical x.x.x tags on main history,
stamps the build's package/lock version from the tag, checks the full gate and
publishes the exact verified tarball. Release tests include older main commits,
annotated tags, invalid formats, off-main commits and plain-main push rejection.
Live npm publication verification is pending npm authentication; no release tag
has been pushed yet.
Local full gate passed: strict lint, Prettier, TypeScript, 88 unit/integration
tests, 17 browser tests with unchanged screenshot baselines, and global-install
package verification. No real sbx operations were performed.
