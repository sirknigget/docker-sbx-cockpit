import { z } from 'zod';

export const inspectionPath = z
  .string()
  .startsWith('/')
  .max(4096)
  .refine((path) => !path.includes('\0'), 'Paths cannot contain NUL');

export const fileEntrySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['directory', 'file', 'symlink', 'other']),
  size: z.number().nonnegative(),
});

export const directorySchema = z.object({
  path: z.string(),
  entries: z.array(fileEntrySchema),
  truncated: z.boolean(),
});

export const fileSchema = z.object({
  path: z.string(),
  content: z.string(),
  size: z.number().nonnegative(),
});

export const diskSchema = z.object({
  path: z.string(),
  entries: z.array(z.object({ path: z.string(), size: z.number() })),
  partial: z.boolean(),
  filesystem: z.object({
    total: z.number().nonnegative(),
    used: z.number().nonnegative(),
    available: z.number().nonnegative(),
    percent: z.string(),
    mount: z.string(),
  }),
});

export const terminalSchema = z.object({
  id: z.string().uuid(),
  sandbox: z.string(),
  output: z.string(),
  cursor: z.number().int(),
  dropped: z.boolean(),
  active: z.boolean(),
  exitCode: z.number().nullable(),
});

export const terminalInputSchema = z.object({
  input: z.string().min(1).max(65536),
});

export type FileEntry = z.infer<typeof fileEntrySchema>;

export type Directory = z.infer<typeof directorySchema>;

export type SandboxFile = z.infer<typeof fileSchema>;

export type DiskUsage = z.infer<typeof diskSchema>;

export type TerminalState = z.infer<typeof terminalSchema>;

export type TerminalInput = z.infer<typeof terminalInputSchema>;
