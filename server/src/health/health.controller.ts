import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { RedisService } from '../redis/redis.service';

@AllowAnonymous()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up'; redis: 'up' }> {
    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.redis.ping()]);

      return {
        status: 'ok',
        database: 'up',
        redis: 'up',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unknown',
        redis: 'unknown',
      });
    }
  }
}
