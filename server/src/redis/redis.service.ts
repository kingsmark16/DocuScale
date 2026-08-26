import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: ReturnType<typeof createClient>;

  constructor(configService: ConfigService) {
    this.client = createClient({
      url: configService.getOrThrow<string>('REDIS_URL'),
    });

    this.client.on('error', (error) => {
      this.logger.error(
        'Redis client error',
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds === undefined) {
      await this.client.set(key, value);
      return;
    }

    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async consumeRateLimit(
    key: string,
    windowSeconds: number,
    maxRequests: number,
  ): Promise<{ allowed: boolean; retryAfter: number | null }> {
    const result = await this.client.eval(
      `local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local retryAfter = redis.call('TTL', KEYS[1])
if count <= tonumber(ARGV[2]) then
  return {1, retryAfter}
end
return {0, retryAfter}`,
      {
        keys: [key],
        arguments: [String(windowSeconds), String(maxRequests)],
      },
    );

    if (
      !Array.isArray(result) ||
      result.length < 2 ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number'
    ) {
      throw new Error('Redis rate-limit counter returned an invalid value');
    }

    return {
      allowed: result[0] === 1,
      retryAfter: result[1] > 0 ? result[1] : null,
    };
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
