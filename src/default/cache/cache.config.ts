import { CacheModuleOptions, CacheStore } from '@nestjs/cache-manager';
import { AppConfigService } from '../../default/config/config.service';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig = async (
  appConfigService: AppConfigService
): Promise<CacheModuleOptions> => {
  const redisHost = appConfigService.get('REDIS_HOST');
  const redisPort = Number(appConfigService.get('REDIS_PORT'));
  const redisPassword = appConfigService.get('REDIS_PASSWORD');
  const redisTTL = Number(appConfigService.get('REDIS_TTL'));

  const store = await redisStore({
    socket: {
      host: redisHost,
      port: redisPort,
    },
    password: redisPassword,
  });

  return {
    store: store as unknown as CacheStore,
    ttl: redisTTL * 60000,
  };
};
