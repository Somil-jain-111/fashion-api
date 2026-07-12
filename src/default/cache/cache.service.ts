import { Injectable } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(private cacheManager: Cache) {}

  async testCache(): Promise<number> {
    const testKey = 'test_key';
    const testValue = 'Hello, Cache!';

    await this.cacheManager.set(testKey, testValue);

    const value = await this.cacheManager.get<string>(testKey);

    return value ? 1 : 0;
  }
}
