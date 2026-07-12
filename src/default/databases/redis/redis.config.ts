import { AppConfigService } from '../../../default/config/config.service';
import { RedisOptions } from 'ioredis';

export const redisConfig = (configService: AppConfigService): RedisOptions => ({
  host: configService.get('REDIS_HOST'),
  port: configService.get('REDIS_PORT'),
  password: configService.get('REDIS_PASSWORD') || undefined,
});
