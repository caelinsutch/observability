import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    WORKER_AUTH_TOKEN: z.string().default('development'),
    // ClickHouse connection
    CLICKHOUSE_URL: z.string().default('http://localhost:8123'),
    CLICKHOUSE_USER: z.string().default('default'),
    CLICKHOUSE_PASSWORD: z.string().default(''),
    CLICKHOUSE_DATABASE: z.string().default('observability'),
  },
  runtimeEnv: process.env,
});