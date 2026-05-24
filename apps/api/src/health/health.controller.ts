import { Controller, Get } from '@nestjs/common';
import { HealthCheckSchema, type HealthCheck } from '@tara/schemas';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  @Get()
  check(): HealthCheck {
    const payload: HealthCheck = {
      status: 'ok',
      service: 'tara-api',
      version: process.env.APP_VERSION ?? '0.0.0',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };

    // Validate at the boundary — guarantees we never lie to the client.
    return HealthCheckSchema.parse(payload);
  }
}
