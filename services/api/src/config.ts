import { z } from 'zod';

const serverConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
});

export function readServerConfig(environment = process.env) {
  return serverConfigSchema.parse(environment);
}
