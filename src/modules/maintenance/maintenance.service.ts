import { Injectable } from '@nestjs/common';
import { SystemConfigKey } from 'src/default/common/entities/system-config.entity';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { TransactionService } from 'src/default/databases/transaction';

const CACHE_KEY = 'system:maintenance:v1';
const CACHE_TTL_SECONDS = 30;
const DEFAULT_MESSAGE = 'Application is under maintenance';

export type MaintenanceState = { enabled: boolean; message: string };

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly systemConfigRepository: SystemConfigRepository,
    private readonly redisService: RedisService,
    private readonly transactionService: TransactionService
  ) {}

  async getState(): Promise<MaintenanceState> {
    try {
      const cached = await this.redisService.get<MaintenanceState>(CACHE_KEY);
      if (cached) return cached;
    } catch (error) {
      ConsoleLogger.error('MAINTENANCE_CACHE_READ_FAILED', error?.stack || error, {
        tag: 'MaintenanceService.getState',
      });
    }

    const values = await this.systemConfigRepository.getValues([
      SystemConfigKey.MAINTENANCE_MODE,
      SystemConfigKey.MAINTENANCE_MESSAGE,
    ]);
    const enabled = values.get(SystemConfigKey.MAINTENANCE_MODE)?.toLowerCase() === 'true';
    const message = values.get(SystemConfigKey.MAINTENANCE_MESSAGE) || DEFAULT_MESSAGE;
    const state = { enabled, message };

    try {
      await this.redisService.set(CACHE_KEY, state, CACHE_TTL_SECONDS);
    } catch (error) {
      ConsoleLogger.error('MAINTENANCE_CACHE_WRITE_FAILED', error?.stack || error, {
        tag: 'MaintenanceService.getState',
      });
    }

    return state;
  }

  async updateState(
    enabled: boolean,
    message: string | undefined,
    updatedBy: number
  ): Promise<MaintenanceState> {
    const normalizedMessage = message?.trim() || DEFAULT_MESSAGE;

    await this.transactionService.execute(async (manager) => {
      await this.systemConfigRepository.setValue(
        SystemConfigKey.MAINTENANCE_MODE,
        String(enabled),
        String(updatedBy),
        manager
      );
      await this.systemConfigRepository.setValue(
        SystemConfigKey.MAINTENANCE_MESSAGE,
        normalizedMessage,
        String(updatedBy),
        manager
      );
    });

    const state = { enabled, message: normalizedMessage };
    try {
      await this.redisService.set(CACHE_KEY, state, CACHE_TTL_SECONDS);
    } catch (error) {
      ConsoleLogger.error('MAINTENANCE_CACHE_WRITE_FAILED', error?.stack || error, {
        tag: 'MaintenanceService.updateState',
      });
    }

    return state;
  }
}
