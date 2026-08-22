import { Injectable } from '@nestjs/common';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import {
  ScanAuditRepository,
  ScanAuditAttempt,
} from '../repository/scan-audit.repository';

@Injectable()
export class InvoiceAuditService {
  constructor(
    private readonly repo: ScanAuditRepository,
  ) {}

  async logAttempt(
    data: ScanAuditAttempt,
  ): Promise<void> {
    try {
      await this.repo.insert(data);
    } catch (err) {
      // Never let audit-logging failure break the actual request/response —
      // but make it loud in logs so it gets noticed and fixed.
      ConsoleLogger.error(
        `Failed to write scan attempt audit row: ${
          (err as Error)?.message
        }`,
        'InvoiceAuditService',
      );
    }
  }
}