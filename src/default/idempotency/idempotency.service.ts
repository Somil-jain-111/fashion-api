import { Injectable } from "@nestjs/common";
import { RedisService } from "../databases/redis/redis.service";
import * as crypto from "crypto";

@Injectable()
export class IdempotencyService {
  private lockTTL = 5; // Lock expiration in seconds
  private hashTTL = 10; // Time to keep request hash in Redis

  constructor(private readonly redisService: RedisService) {}

  generateHash(data: any): string {
    const safeData = data ?? {};
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(safeData))
      .digest("hex");
  }

  async checkDuplicateRequest(data: any): Promise<boolean> {
    const hash = this.generateHash(data);
    const isDuplicate = await this.redisService.get(hash);

    if (isDuplicate) {
      return true; // Duplicate request detected
    }

    // Store hash in Redis with a TTL
    await this.redisService.set(hash, "exists", this.hashTTL);
    return false; // No duplicate found
  }

  async acquireLock(idempotencyKey: string): Promise<boolean> {
    const lockKey = `idempotency-lock:${idempotencyKey}`;
    const result = await this.redisService.set(lockKey, "locked", this.lockTTL);
    return result === "OK"; // Check if lock is acquired
  }

  async releaseLock(idempotencyKey: string): Promise<void> {
    const lockKey = `idempotency-lock:${idempotencyKey}`;
    await this.redisService.delete(lockKey);
  }
}
