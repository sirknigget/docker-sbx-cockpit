#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
const { values } = parseArgs({
  options: {
    port: { type: 'string', short: 'p', default: process.env.PORT ?? '9876' },
    help: { type: 'boolean', short: 'h' },
  },
});
if (values.help) {
  console.log(
    'Usage: sbx-cockpit [--port PORT]\nServes Docker Sandbox Cockpit on 127.0.0.1 (default: 9876).',
  );
} else {
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Port must be an integer from 1 to 65535');
  process.env.PORT = String(port);
  createRequire(import.meta.url)('../dist/server/main.js');
}
