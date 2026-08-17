import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoiceScanAttemptAuditEntity } from '../entities/invoice-scan-attempt-audit.entity';
import {
  ScanAttemptType,
  ValidationOutcome,
} from '../enum/scan-attempt.enum';
import { ScanSource } from '../enum/invoice-scan-session.enum';

export type ScanAuditAttempt = {
  userId: string;
  appVersion?: string;
  endpoint: string;
  httpMethod: string;
  attemptType: ScanAttemptType;
  scanType?: ScanSource;
  invoiceNumber?: string;
  sessionId?: string;
  pairUids?: string[];
  outcome: ValidationOutcome;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ScanAuditRepository {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async insert(
    data: ScanAuditAttempt,
  ): Promise<void> {
    const repo =
      this.dataSource.getRepository(
        InvoiceScanAttemptAuditEntity,
      );

    await repo.save(
      repo.create(data),
    );
  }
}