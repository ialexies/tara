import { z } from 'zod';

/**
 * Health check response shape.
 * Used by both apps/api (to produce) and apps/web (to consume).
 * This file is the canonical source of truth for the contract.
 */
export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.string(),
  version: z.string(),
  uptime: z.number().describe('seconds since process start'),
  timestamp: z.string().datetime(),
  checks: z
    .object({
      database: z.enum(['ok', 'down']).optional(),
      redis: z.enum(['ok', 'down']).optional(),
    })
    .optional(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
