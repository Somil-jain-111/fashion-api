import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoiceTransferRequestEntity } from 'src/modules/distributor-transfer/entities/invoice-transfer-request.entity';
import { TransferRequestStatus } from 'src/modules/distributor-transfer/enum/transfer-request-status.enum';

export interface ListDistributorTransfersFilters {
  fromDistributorId?: number;
  toDistributorId?: number;
  status?: TransferRequestStatus;
  invoiceNumber?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

@Injectable()
export class SuperAdminDistributorTransferRepository {
  constructor(private readonly dataSource: DataSource) {}

  private baseQuery() {
    return this.dataSource
      .getRepository(InvoiceTransferRequestEntity)
      .createQueryBuilder('transfer')
      .innerJoin('transfer.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      .innerJoin('transfer.fromDistributor', 'fromDistributor')
      .addSelect(['fromDistributor.id', 'fromDistributor.firmName', 'fromDistributor.username', 'fromDistributor.mobile'])
      .leftJoin('transfer.toDistributor', 'toDistributor')
      .addSelect(['toDistributor.id', 'toDistributor.firmName', 'toDistributor.username', 'toDistributor.mobile']);
  }

  async list(filters: ListDistributorTransfersFilters) {
    const qb = this.baseQuery()
      .orderBy('transfer.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.fromDistributorId) {
      qb.andWhere('transfer.from_distributor_id = :fromDistributorId', {
        fromDistributorId: filters.fromDistributorId,
      });
    }
    if (filters.toDistributorId) {
      qb.andWhere('transfer.to_distributor_id = :toDistributorId', {
        toDistributorId: filters.toDistributorId,
      });
    }
    if (filters.status) {
      qb.andWhere('transfer.status = :status', { status: filters.status });
    }
    if (filters.invoiceNumber) {
      qb.andWhere('invoice.invoice_no = :invoiceNumber', { invoiceNumber: filters.invoiceNumber });
    }
    if (filters.fromDate) {
      qb.andWhere('transfer.created_at >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('transfer.created_at <= :toDate', { toDate: filters.toDate });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findByRequestNo(requestNo: string) {
    return this.baseQuery().where('transfer.request_no = :requestNo', { requestNo }).getOne();
  }
}
