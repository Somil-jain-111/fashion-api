import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
} from 'typeorm';
import { InvoiceScanExceptionEntity } from '../entities/invoice-scan-exception.entity';
import {
  ScanExceptionStatus,
  ScanExceptionType,
} from '../enum/exception.enum';

@Injectable()
export class InvoiceExceptionRepository {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async create(
    data: {
      invoiceId: string;
      sessionId?: string;
      pairUid?: string;
      itemCode?: string;
      exceptionType: ScanExceptionType;
      rawPayload?: Record<string, unknown>;
    },
    manager?: EntityManager,
  ): Promise<InvoiceScanExceptionEntity> {
    const repo =
      manager?.getRepository(
        InvoiceScanExceptionEntity,
      ) ??
      this.dataSource.getRepository(
        InvoiceScanExceptionEntity,
      );

    return repo.save(
      repo.create(data),
    );
  }

  findByInvoice(
    invoiceId: string,
    status?: ScanExceptionStatus,
  ) {
    return this.dataSource
      .getRepository(
        InvoiceScanExceptionEntity,
      )
      .find({
        where: status
          ? {
              invoiceId,
              status,
            }
          : {
              invoiceId,
            },
        order: {
          createdAt: 'DESC',
        },
      });
  }

  findById(id: string) {
    return this.dataSource
      .getRepository(
        InvoiceScanExceptionEntity,
      )
      .findOne({
        where: {
          id,
        },
      });
  }

  async updateReview(
    id: string,
    reviewerId: string,
    status: ScanExceptionStatus,
    notes?: string,
  ): Promise<
    InvoiceScanExceptionEntity | null
  > {
    const repo =
      this.dataSource.getRepository(
        InvoiceScanExceptionEntity,
      );

    const row = await repo.findOne({
      where: {
        id,
      },
    });

    if (!row) {
      return null;
    }

    row.status = status;
    row.reviewedBy = reviewerId;
    row.reviewedAt = new Date();

    if (notes) {
      row.resolutionNotes = notes;
    }

    return repo.save(row);
  }
}