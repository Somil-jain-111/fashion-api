import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

const LOCK_TTL_MS = 15_000;

@Injectable()
export class RedisLockService {
  constructor(private readonly redis: RedisService) {}

  async withLock<T>(key: string, work: () => Promise<T>): Promise<T> {
    const token = randomUUID();
    const acquired = await this.redis.client.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
    if (!acquired) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.LOCK_UNAVAILABLE);
    try {
      return await work();
    } finally {
      await this.redis.client.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then
           return redis.call("del", KEYS[1])
         else return 0 end`,
        1,
        key,
        token
      );
    }
  }
}
