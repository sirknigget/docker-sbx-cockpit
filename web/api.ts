import { z } from 'zod';
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  method = 'GET',
  body?: string,
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'X-Cockpit-Request': '1',
  };
  const response =
    method === 'GET'
      ? await fetch(`/api${path}`, { headers })
      : await mutation(path, method, body);
  const data = await response.json();
  if (!response.ok)
    throw new Error(z.object({ message: z.string() }).parse(data).message);
  return schema.parse(data);
}

function mutation(path: string, method: string, body?: string) {
  return fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Cockpit-Request': '1' },
    body,
  });
}
