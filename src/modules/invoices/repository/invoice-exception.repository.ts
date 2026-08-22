import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { InvoiceScanExceptionEntity } from '../entities/invoice-scan-exception.entity';
import { ScanExceptionStatus, ScanExceptionType } from '../enum/exception.enum';
import { BaseRepository } from 'src/default/common/repositories';

@Injectable()
export class InvoiceExceptionRepository extends BaseRepository<InvoiceScanExceptionEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceScanExceptionEntity));
  }

  async createException(
    data: {
      invoiceId: string;
      sessionId?: string;
      pairUid?: string;
      itemCode?: string;
      exceptionType: ScanExceptionType;
      rawPayload?: Record<string, unknown>;
    },
    queryRunner?: QueryRunner
  ): Promise<InvoiceScanExceptionEntity> {
    const repo = this.getRepository(queryRunner);
    return await repo.save(
      repo.create({
        invoice: { id: Number(data.invoiceId) } as any,
        sessionId: data.sessionId,
        pairUid: data.pairUid,
        itemCode: data.itemCode,
        exceptionType: data.exceptionType,
        rawPayload: data.rawPayload,
      })
    );
  }

  findByInvoice(invoiceId: string, status?: ScanExceptionStatus) {
    return this.findMany({
      where: status
        ? {
            invoice: { id: Number(invoiceId) },
            status,
          }
        : {
            invoice: { id: Number(invoiceId) },
          },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateReview(
    id: string,
    reviewerId: string,
    status: ScanExceptionStatus,
    notes?: string
  ): Promise<InvoiceScanExceptionEntity | null> {
    const repo = this.getRepository();

    const row = await repo.findOne({
      where: {
        id: Number(id),
      },
    });

    if (!row) {
      return null;
    }

    row.status = status;
    row.reviewer = { id: Number(reviewerId) } as any;
    row.reviewedAt = new Date();

    if (notes) {
      row.resolutionNotes = notes;
    }

    return repo.save(row);
  }
}
