import { z } from 'zod';
import { nameSchema, portSchema, referenceSchema } from './contracts';

export const templateSchema = z.object({
  id: z.string(),
  repository: z.string(),
  tag: z.string(),
  flavor: z.string().optional(),
  created_at: z.string().optional(),
  size: z.number().nonnegative(),
});

export const templatesSchema = z.object({ images: z.array(templateSchema) });

export const saveTemplateSchema = z.object({
  sandbox: nameSchema,
  reference: referenceSchema,
});

export const removeTemplateSchema = z.object({ reference: referenceSchema });

export type Template = z.infer<typeof templateSchema>;

export function templateReference(template: Template) {
  const reference = `${template.repository}:${template.tag}`;

  return referenceSchema.safeParse(reference).success ? reference : template.id;
}

export const scopeSchema = z.union([
  z.literal('global'),
  z.literal('host'),
  nameSchema,
]);

export const services = [
  'anthropic',
  'copilot',
  'cursor',
  'devin',
  'droid',
  'github',
  'google',
  'groq',
  'mistral',
  'nebius',
  'openai',
  'openrouter',
  'xai',
] as const;

const registrySchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9.:-]*$/);
const hostSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-zA-Z0-9*][a-zA-Z0-9.*:-]*$/);
const valueSchema = z
  .string()
  .min(1)
  .max(65536)
  .refine((value) => !value.includes('\0'));

export const setSecretSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('service'),
    scope: scopeSchema,
    name: z.enum(services),
    value: valueSchema,
  }),
  z.object({
    kind: z.literal('registry'),
    scope: scopeSchema,
    name: registrySchema,
    username: z.string().max(256).optional(),
    value: valueSchema,
  }),
  z
    .object({
      kind: z.literal('custom'),
      scope: scopeSchema,
      hosts: z.array(hostSchema).min(1).max(12),
      env: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
      reference: z
        .string()
        .max(2048)
        .regex(/^(op:\/\/|arn:aws[a-z-]*:secretsmanager:)[^\s]+$/)
        .optional(),
      value: valueSchema.optional(),
    })
    .refine((input) => Boolean(input.value) !== Boolean(input.reference), {
      message: 'Provide exactly one secret value or dynamic reference',
      path: ['value'],
    }),
]);

export const removeSecretSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('service'),
    scope: scopeSchema,
    name: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9:._-]*$/),
  }),
  z.object({
    kind: z.literal('registry'),
    scope: scopeSchema,
    name: registrySchema,
  }),
  z.object({
    kind: z.literal('custom'),
    scope: scopeSchema,
    placeholder: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
  }),
]);

const inventoryScopeSchema = z
  .string()
  .transform((scope) => (scope === 'host-only' ? 'host' : scope));

export const secretSchema = z.object({
  scope: inventoryScopeSchema,
  type: z.string(),
  name: z.string(),
});

export const customSecretSchema = z.object({
  scope: inventoryScopeSchema,
  targets: z.array(z.string()),
  env: z.string().optional(),
  placeholder: z.string(),
});

export const secretsSchema = z.object({
  secrets: z.array(secretSchema).default([]),
  custom_secrets: z.array(customSecretSchema).default([]),
});

export type SetSecret = z.infer<typeof setSecretSchema>;

export type RemoveSecret = z.infer<typeof removeSecretSchema>;

export type SecretInventory = z.infer<typeof secretsSchema>;

export const portsSchema = z.object({ ports: z.array(portSchema) });

const portBindingSchema = z.object({
  hostIp: z
    .string()
    .max(45)
    .regex(/^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[a-fA-F0-9:]+\]?$/)
    .optional(),
  hostPort: z.number().int().min(1).max(65535).optional(),
  sandboxPort: z.number().int().min(1).max(65535),
  protocol: z
    .enum(['tcp', 'tcp4', 'tcp6', 'udp', 'udp4', 'udp6'])
    .default('tcp4'),
});

export const publishPortSchema = portBindingSchema.refine(
  (port) => !port.hostIp || port.hostPort !== undefined,
  { message: 'An explicit host IP requires a host port', path: ['hostPort'] },
);

export const unpublishPortSchema = portBindingSchema.extend({
  hostPort: z.number().int().min(1).max(65535),
});

export type PublishPort = z.infer<typeof publishPortSchema>;

export function portSpec(port: PublishPort) {
  const hostIp = port.hostIp?.replace(/^\[|\]$/g, '');
  const address = hostIp?.includes(':') ? `[${hostIp}]` : hostIp;
  const host = port.hostPort
    ? `${address ? `${address}:` : ''}${port.hostPort}:`
    : '';

  return `${host}${port.sandboxPort}/${port.protocol}`;
}
