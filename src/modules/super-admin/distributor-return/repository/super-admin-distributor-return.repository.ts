import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DistributorReturnEntity } from 'src/modules/distributor-return/entities/distributor-return.entity';

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
      .getRepository(DistributorReturnEntity)
      .createQueryBuilder('return')
      .innerJoin('return.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      .innerJoin('return.retailer', 'retailer')
      .addSelect(['retailer.id', 'retailer.firmName', 'retailer.username', 'retailer.mobile'])
      .innerJoin('return.distributor', 'distributor')
      .addSelect(['distributor.id', 'distributor.firmName', 'distributor.username', 'distributor.mobile'])
      .leftJoin('return.details', 'details')
      .addSelect(['details.id', 'details.pair_uid', 'details.points_refunded']);
  }

  async list(filters: ListDistributorReturnsFilters) {
    // details is one-to-many — page over return ids first (no one-to-many join), then
    // re-fetch just those ids with details joined in a second, unpaginated query. Joining
    // details directly into a paginated query would multiply rows per return and corrupt
    // getManyAndCount()'s totals/skip/take.
    const idQb = this.dataSource
      .getRepository(DistributorReturnEntity)
      .createQueryBuilder('return')
      .innerJoin('return.invoice', 'invoice')
      .innerJoin('return.retailer', 'retailer')
      .innerJoin('return.distributor', 'distributor')
      .orderBy('return.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.distributorId) {
      idQb.andWhere('return.distributor_id = :distributorId', { distributorId: filters.distributorId });
    }
    if (filters.retailerId) {
      idQb.andWhere('return.retailer_id = :retailerId', { retailerId: filters.retailerId });
    }
    if (filters.invoiceNumber) {
      idQb.andWhere('invoice.invoice_no = :invoiceNumber', { invoiceNumber: filters.invoiceNumber });
    }
    if (filters.fromDate) {
      idQb.andWhere('return.created_at >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      idQb.andWhere('return.created_at <= :toDate', { toDate: filters.toDate });
    }

    const [idRows, total] = await idQb.getManyAndCount();
    if (!idRows.length) {
      return { items: [], total };
    }

    const items = await this.baseQuery()
      .where('return.id IN (:...ids)', { ids: idRows.map((row) => row.id) })
      .orderBy('return.id', 'DESC')
      .getMany();

    return { items, total };
  }

  findById(id: string) {
    return this.baseQuery().where('return.id = :id', { id }).getOne();
  }
}
