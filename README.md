# Docker Sandbox Cockpit

Local NestJS + React control plane for Docker Sandboxes.

Requires Node.js 22.12+ and `sbx` on PATH with Docker Sandboxes installed.

```sh
npm ci
npm run build
npm start                         # http://127.0.0.1:9876
npm start -- --port 9880
# Or: npm link && sbx-cockpit --port 9880
```

Development: run `npm run dev` and `npm run dev:web` in separate terminals.
Docker Sandbox Markdown documentation lives in `docs/docker-sandboxes/`;
installed CLI help lives in `docs/sbx-help/`. See TASKS.md for vertical slices.
