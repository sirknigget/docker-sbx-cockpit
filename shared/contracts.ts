import { z } from 'zod';

export const agents = [
  'shell',
  'claude',
  'codex',
  'copilot',
  'cursor',
  'devin',
  'docker-agent',
  'droid',
  'gemini',
  'kiro',
  'opencode',
] as const;

export const nameSchema = z
  .string()
  .min(2)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+$/)
  .refine((value) => value !== 'default', 'The name default is reserved');

export const referenceSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/@-]*$/);

export const pathSchema = z
  .string()
  .startsWith('/')
  .max(4096)
  .refine((value) => !value.includes('\0'), 'Invalid path');

export const portSchema = z.object({
  host_ip: z.string(),
  host_port: z.number(),
  sandbox_port: z.number(),
  protocol: z.string(),
});

export const sandboxSchema = z.object({
  name: z.string(),
  id: z.string(),
  agent: z.string(),
  status: z.string(),
  workspaces: z.array(z.string()).default([]),
  ports: z.array(portSchema).default([]),
  created_at: z.string().optional(),
});

export const inventorySchema = z.object({
  sandboxes: z.array(sandboxSchema).default([]),
});

export const createSchema = z.object({
  name: nameSchema,
  agent: z.enum(agents),
  workspaces: z.array(pathSchema).max(12).default([]),
  template: referenceSchema.optional(),
});

export type Sandbox = z.infer<typeof sandboxSchema>;

export type CreateSandbox = z.infer<typeof createSchema>;

export type Port = z.infer<typeof portSchema>;

export const resultSchema = z.object({ output: z.string() });
