import { Injectable } from '@nestjs/common';
import { TransactionService } from 'src/default/databases/transaction/transaction.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { SystemConfigKey } from 'src/default/common/entities/system-config.entity';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { RetailerScanAgeRepository } from '../repository/retailer-scan-age.repository';

export const DEFAULT_SCAN_AGE_DAYS_FALLBACK = 7;
export const MIN_SCAN_AGE_DAYS = 1;
export const MAX_SCAN_AGE_DAYS = 90;

@Injectable()
export class RetailerScanAgeService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly systemConfig: SystemConfigRepository,
    private readonly scanAgeRepo: RetailerScanAgeRepository
  ) {}

  async getEffectiveScanAgeDays(retailerId: string): Promise<{
    days: number;
    source: 'override' | 'default';
  }> {
    const override = await this.scanAgeRepo.findOverride(retailerId);

    if (override) {
      return {
        days: override.scanAgeDays,
        source: 'override',
      };
    }

    const days = await this.systemConfig.getNumber(
      SystemConfigKey.DEFAULT_SCAN_AGE_DAYS,
      DEFAULT_SCAN_AGE_DAYS_FALLBACK
    );

    return {
      days,
      source: 'default',
    };
  }

  async updateScanAge(
    retailerId: string,
    newDays: number,
    changedBy: string,
    reason: string,
    approvalReference?: string
  ): Promise<void> {
    if (!Number.isInteger(newDays) || newDays < MIN_SCAN_AGE_DAYS || newDays > MAX_SCAN_AGE_DAYS) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVALID_SCAN_AGE_VALUE);
    }

    if (!reason || !reason.trim()) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SCAN_AGE_REASON_REQUIRED);
    }

    await this.transactionService.execute(async (manager) => {
      const existing = await this.scanAgeRepo.findOverride(retailerId, manager);

      const oldValue =
        existing?.scanAgeDays ??
        (await this.systemConfig.getNumber(
          SystemConfigKey.DEFAULT_SCAN_AGE_DAYS,
          DEFAULT_SCAN_AGE_DAYS_FALLBACK
        ));

      await this.scanAgeRepo.upsertOverride(retailerId, newDays, changedBy, manager);

      await this.scanAgeRepo.writeAuditLog(
        {
          retailerId,
          oldValue,
          newValue: newDays,
          changedBy,
          reason,
          approvalReference,
        },
        manager
      );
    });
  }

  history(retailerId: string) {
    return this.scanAgeRepo.history(retailerId);
  }

  /**
   * Pure — no DB access — kept separate so it's directly unit-testable.
   * eligibleUntil is inclusive: an invoice dated day 0 with a 7-day window
   * is scannable through day 7 at 23:59:59.999.
   */
  static computeEligibility(
    invoiceDate: Date,
    scanAgeDays: number,
    now: Date = new Date()
  ): {
    eligible: boolean;
    eligibleUntil: Date;
  } {
    const eligibleUntil = new Date(invoiceDate);

    eligibleUntil.setDate(eligibleUntil.getDate() + scanAgeDays);

    eligibleUntil.setHours(23, 59, 59, 999);

    return {
      eligible: now.getTime() <= eligibleUntil.getTime(),
      eligibleUntil,
    };
  }
}
