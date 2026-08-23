import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { CustomerReturnEntity } from '../entities/customer-return.entity';

@Injectable()
export class CustomerReturnRepository extends BaseRepository<CustomerReturnEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(CustomerReturnEntity));
  }

  async findByPairUid(
    pairUid: string,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnEntity | null> {
    return await this.getRepository(queryRunner)
      .createQueryBuilder('cr')
      .where('cr.pair_uid = :pairUid', { pairUid: pairUid.trim() })
      .getOne();
  }

  async saveCustomerReturn(
    data: Partial<CustomerReturnEntity>,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnEntity> {
    return await this.save(data, queryRunner);
  }

  async findHistoryByRetailer(
    retailerId: string | number,
    options: {
      page: number;
      limit: number;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
    queryRunner?: QueryRunner
  ): Promise<[CustomerReturnEntity[], number]> {
    const qb = this.getRepository(queryRunner)
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.invoice', 'invoice')
      .leftJoinAndSelect('cr.invoiceItem', 'invoiceItem')
      .leftJoinAndSelect('cr.pair', 'pair')
      .leftJoinAndSelect('cr.attachments', 'attachments')
      .where('cr.retailer_id = :retailerId', { retailerId: String(retailerId) })
      .orderBy('cr.createdAt', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit);

    if (options.search) {
      qb.andWhere(
        '(cr.pair_uid LIKE :search OR invoice.invoice_no LIKE :search OR invoiceItem.item_code LIKE :search)',
        {
          search: `%${options.search.trim()}%`,
        }
      );
    }

    if (options.startDate) {
      qb.andWhere('cr.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      qb.andWhere('cr.createdAt <= :endDate', { endDate: `${options.endDate} 23:59:59` });
    }

    return await qb.getManyAndCount();
  }

  async findDetailOwnedByRetailer(
    id: string | number,
    retailerId: string | number,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnEntity | null> {
    return await this.getRepository(queryRunner)
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.invoice', 'invoice')
      .leftJoinAndSelect('cr.invoiceItem', 'invoiceItem')
      .leftJoinAndSelect('cr.pair', 'pair')
      .leftJoinAndSelect('cr.attachments', 'attachments')
      .where('cr.id = :id', { id: Number(id) })
      .andWhere('cr.retailer_id = :retailerId', { retailerId: String(retailerId) })
      .getOne();
  }
}
