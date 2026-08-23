import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { SystemConfigKey } from 'src/default/common/entities/system-config.entity';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { InvoicePointHistoryRepository } from 'src/modules/invoices/repository';
import { UserRewardRepository } from 'src/modules/invoices/repository';
import { TransactionService } from 'src/default/databases/transaction';

export const DEFAULT_POINTS_EXPIRY_DAYS_FALLBACK = 365;

@Injectable()
export class PointsExpiryConfigService {
  constructor(private readonly systemConfig: SystemConfigRepository) {}

  getExpiryDays(): Promise<number> {
    return this.systemConfig.getNumber(
      SystemConfigKey.POINTS_EXPIRY_DAYS,
      DEFAULT_POINTS_EXPIRY_DAYS_FALLBACK
    );
  }

  setExpiryDays(days: number, updatedBy: string): Promise<void> {
    if (!Number.isInteger(days) || days < 1) {
      throw new Error('Expiry window must be a positive integer number of days');
    }
    return this.systemConfig.setValue(SystemConfigKey.POINTS_EXPIRY_DAYS, String(days), updatedBy);
  }

  /** Pure — unit-testable without a database. */
  static computeExpiryDate(earnedAt: Date, expiryDays: number): Date {
    const expiresAt = new Date(earnedAt);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    return expiresAt;
  }
}

@Injectable()
export class PointsExpiryJobService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly pointHistories: InvoicePointHistoryRepository,
    private readonly userRewards: UserRewardRepository
  ) {}

  // Runs daily at 02:00 server time — adjust via CronExpression as needed.
  // Requires ScheduleModule.forRoot() to be imported once in AppModule.
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyExpiry(): Promise<void> {
    await this.run(new Date());
  }

  /** Extracted so it can be invoked directly (manually, or from a test) without waiting for the cron trigger. */
  async run(asOf: Date): Promise<{ expiredRows: number; totalPointsExpired: number }> {
    let expiredRows = 0;
    let totalPointsExpired = 0;

    await this.transactionService.runInTransaction(async (queryRunner) => {
      const expirable = await this.pointHistories.findExpirable(asOf, queryRunner);

      for (const row of expirable) {
        const remaining = Number((row as any).remaining_points ?? 0);

        if (remaining <= 0) {
          continue;
        }

        const userId = String((row as any).user?.id ?? (row as any).userId);

        await this.userRewards.deductPoints(userId, remaining, queryRunner);
        await this.pointHistories.markExpired(String((row as any).id), queryRunner);

        expiredRows += 1;
        totalPointsExpired += remaining;
      }
    });

    ConsoleLogger.log(
      `Points expiry run: ${expiredRows} rows expired, ${totalPointsExpired} points removed`,
      'PointsExpiryJobService'
    );

    return { expiredRows, totalPointsExpired };
  }
}
