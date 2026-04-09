import { z } from 'zod';

const runtimeEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://127.0.0.1:4000'),
});

const parsedEnv = runtimeEnvSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4000',
});

if (!parsedEnv.success) {
  throw new Error('Invalid frontend environment configuration');
}

export const runtimeEnv = parsedEnv.data;
