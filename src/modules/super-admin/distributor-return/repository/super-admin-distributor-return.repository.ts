import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoicePairReturnEntity } from 'src/modules/distributor-return/entities/invoice-pair-return.entity';

export interface ListDistributorReturnsFilters {
  distributorId?: number;
  retailerId?: number;
  invoiceNumber?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

@Injectable()
export class SuperAdminDistributorReturnRepository {
  constructor(private readonly dataSource: DataSource) {}

  private baseQuery() {
    return this.dataSource
      .getRepository(InvoicePairReturnEntity)
      .createQueryBuilder('return')
      .innerJoin('return.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      .innerJoin('return.pair', 'pair')
      .addSelect(['pair.id', 'pair.pair_uid', 'pair.pair_qr', 'pair.status'])
      .innerJoin('return.retailer', 'retailer')
      .addSelect(['retailer.id', 'retailer.firmName', 'retailer.username', 'retailer.mobile'])
      .innerJoin('return.distributor', 'distributor')
      .addSelect(['distributor.id', 'distributor.firmName', 'distributor.username', 'distributor.mobile']);
  }

  async list(filters: ListDistributorReturnsFilters) {
    const qb = this.baseQuery()
      .orderBy('return.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.distributorId) {
      qb.andWhere('return.distributor_id = :distributorId', { distributorId: filters.distributorId });
    }
    if (filters.retailerId) {
      qb.andWhere('return.retailer_id = :retailerId', { retailerId: filters.retailerId });
    }
    if (filters.invoiceNumber) {
      qb.andWhere('invoice.invoice_no = :invoiceNumber', { invoiceNumber: filters.invoiceNumber });
    }
    if (filters.fromDate) {
      qb.andWhere('return.created_at >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('return.created_at <= :toDate', { toDate: filters.toDate });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findById(id: string) {
    return this.baseQuery().where('return.id = :id', { id }).getOne();
  }
}
