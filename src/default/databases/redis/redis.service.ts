import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { ConsoleLogger } from "../../logger/console/console.service";
import { AppConfigService } from "src/default/config/config.service";

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;

  constructor(private readonly configService: AppConfigService) {
    this.client = new Redis(this.getRedisConfig());
  }

  private getRedisConfig() {
    return {
      host: this.configService.get("REDIS_HOST") || "127.0.0.1",
      port: Number(this.configService.get("REDIS_PORT")) || 6379,
      password: this.configService.get("REDIS_PASSWORD") || undefined,
      db: Number(this.configService.get("REDIS_DB")) || 0,

      /**
       * Required for BullMQ also.
       */
      maxRetriesPerRequest: null,
    };
  }

  /**
   * Use this for BullMQ connection.
   * Do not directly use `this.client` for BullMQ.
   */
  getBullMqConnection(): Redis {
    return this.client.duplicate({
      maxRetriesPerRequest: null,
    });
  }

  async set(key: string, value: any, ttl?: number): Promise<"OK" | null> {
    return ttl
      ? await this.client.set(key, JSON.stringify(value), "EX", ttl)
      : await this.client.set(key, JSON.stringify(value));
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async delete(key: string): Promise<number> {
    ConsoleLogger.log(`Deleting key ${key}`, "RedisService");
    return this.client.del(key);
  }

  async quit() {
    ConsoleLogger.log("Closing Redis connection", "RedisService");
    await this.client.quit();
  }

  async onModuleDestroy() {
    ConsoleLogger.log("Closing Redis connection", "RedisService");
    await this.client.quit();
  }
}
