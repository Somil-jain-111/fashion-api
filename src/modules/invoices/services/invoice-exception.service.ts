import { Injectable } from '@nestjs/common';
import { InvoiceExceptionRepository } from '../repository/invoice-exception.repository';
import {
  ScanExceptionStatus,
  ScanExceptionType,
} from '../enum/exception.enum';

@Injectable()
export class InvoiceExceptionService {
  constructor(
    private readonly exceptions: InvoiceExceptionRepository,
  ) {}

  flag(params: {
    invoiceId: string;
    sessionId?: string;
    pairUid?: string;
    itemCode?: string;
    exceptionType: ScanExceptionType;
    rawPayload?: Record<string, unknown>;
  }) {
    return this.exceptions.create(params);
  }

  async flagMany(
    entries: Array<{
      invoiceId: string;
      sessionId?: string;
      pairUid?: string;
      itemCode?: string;
      exceptionType: ScanExceptionType;
      rawPayload?: Record<string, unknown>;
    }>,
  ) {
    await Promise.all(
      entries.map((entry) =>
        this.exceptions.create(entry),
      ),
    );
  }

  list(
    invoiceId: string,
    status?: ScanExceptionStatus,
  ) {
    return this.exceptions.findByInvoice(
      invoiceId,
      status,
    );
  }

  async review(
    exceptionId: string,
    reviewerId: string,
    status: ScanExceptionStatus,
    notes?: string,
  ) {
    const updated =
      await this.exceptions.updateReview(
        exceptionId,
        reviewerId,
        status,
        notes,
      );

    return updated;
  }
}