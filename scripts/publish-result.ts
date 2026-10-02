import { z } from 'zod';

const packageSchema = z.object({
  name: z.literal('docker-sbx-cockpit'),
  files: z.array(z.object({ path: z.string() })).min(1),
});
const outputSchema = z.union([
  packageSchema,
  z
    .object({ 'docker-sbx-cockpit': packageSchema })
    .strict()
    .transform((result) => result['docker-sbx-cockpit']),
]);

export function publishedFiles(output: string) {
  return outputSchema.parse(JSON.parse(output)).files.map((file) => file.path);
}
