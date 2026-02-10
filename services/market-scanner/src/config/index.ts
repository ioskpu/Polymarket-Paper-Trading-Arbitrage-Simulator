import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  POLYMARKET_API_URL: z.string().url().default('https://clob.polymarket.com'),
  SCAN_INTERVAL_MS: z.coerce.number().default(60000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);
